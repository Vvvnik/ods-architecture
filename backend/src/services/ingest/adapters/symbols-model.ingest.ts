/**
 * Shared native symbols model (typescript / csharp / python / cpp):
 * schema_version 1: { symbols: [...] } with refs imports/exports/inherits/implements
 * schema_version 2: + usages[] (calls | injects in MVP 008)
 *
 * supported_schema_versions: ['1','2'] for all languages on this factory (008 R11).
 */
import type { EdgeType } from '../../../domain/graph-edge.js';
import type { NodeKind } from '../../../domain/graph-node.js';
import type { IngestAdapter, IngestContext, IngestTransformResult, GraphEdgeInput, GraphNodeInput } from '../types.js';
import { isEdgeType, isNodeKind } from '../types.js';
import { assignStableNodeIds, buildEdgeId, buildNodeId } from '../node-id.js';

interface SymbolModelRef {
  type: string;
  name: string;
  kind?: string;
  path?: string;
  qualified_name?: string;
  location?: {
    start_line?: number;
    start_col?: number;
    end_line?: number;
    end_col?: number;
  };
}

interface SymbolModelEntry {
  name: string;
  kind: string;
  path: string;
  qualified_name?: string;
  parent_qualified_name?: string;
  signature?: string;
  location?: {
    start_line?: number;
    start_col?: number;
    end_line?: number;
    end_col?: number;
  };
  refs?: SymbolModelRef[];
}

interface UsageEntry {
  from: string;
  to: string;
  type: string;
  path?: string;
  location?: {
    start_line?: number;
    start_col?: number;
    end_line?: number;
    end_col?: number;
  };
  metadata?: Record<string, unknown>;
}

interface SymbolsModel {
  symbols: SymbolModelEntry[];
  usages?: UsageEntry[];
}

const MVP_USAGE_EDGE_TYPES = new Set(['calls', 'injects']);

function withLayer(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> {
  return { ...(metadata ?? {}), layer: 'code' };
}

function resolveQnToNodeId(
  qn: string,
  nodesByQn: Map<string, string[]>,
): string | undefined {
  const ids = nodesByQn.get(qn);
  if (!ids || ids.length !== 1) {
    return undefined;
  }
  return ids[0];
}

export function createSymbolsModelIngestAdapter(parserId: string, language: string): IngestAdapter {
  return {
    parser_id: parserId,
    supported_schema_versions: ['1', '2'],

    transform(model: unknown, ctx: IngestContext): IngestTransformResult {
      const parsed = model as SymbolsModel;
      const symbols = Array.isArray(parsed.symbols) ? parsed.symbols : [];

      const nodes: GraphNodeInput[] = symbols
        .filter((symbol) => isNodeKind(symbol.kind))
        .map((symbol) => ({
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: symbol.kind as NodeKind,
          name: symbol.name,
          qualified_name: symbol.qualified_name ?? symbol.name,
          language,
          path: symbol.path,
          location: symbol.location ?? null,
          parent_id: null as string | null,
          signature: symbol.signature ?? null,
          metadata: withLayer(
            symbol.parent_qualified_name
              ? { parent_qualified_name: symbol.parent_qualified_name }
              : null,
          ),
        }));

      const nodesWithIds = assignStableNodeIds(nodes);
      const nodeIdByQualified = new Map<string, string>();
      const moduleIdByPath = new Map<string, string>();
      const nodesByQn = new Map<string, string[]>();

      for (const node of nodesWithIds) {
        const key = `${node.path}:${node.qualified_name ?? node.name}`;
        nodeIdByQualified.set(key, node.id!);
        const qn = node.qualified_name ?? node.name;
        const existing = nodesByQn.get(qn) ?? [];
        existing.push(node.id!);
        nodesByQn.set(qn, existing);
        if (node.kind === 'module' && node.path) {
          moduleIdByPath.set(node.path, node.id!);
        }
      }

      for (const node of nodesWithIds) {
        const parentQName = node.metadata?.parent_qualified_name;
        if (typeof parentQName === 'string') {
          const parentKey = `${node.path}:${parentQName}`;
          const parentId = nodeIdByQualified.get(parentKey);
          if (parentId) {
            node.parent_id = parentId;
            continue;
          }
          const byQn = nodesByQn.get(parentQName);
          if (byQn && byQn.length === 1) {
            node.parent_id = byQn[0];
            continue;
          }
        }
        if (node.kind !== 'module' && !node.parent_id) {
          const moduleId = moduleIdByPath.get(node.path);
          if (moduleId) {
            node.parent_id = moduleId;
          }
        }
      }

      const edges: GraphEdgeInput[] = symbols.flatMap((symbol) => {
        if (!isNodeKind(symbol.kind)) {
          return [];
        }

        const fromKey = `${symbol.path}:${symbol.qualified_name ?? symbol.name}`;
        const resolvedFromId = nodeIdByQualified.get(fromKey);
        if (!resolvedFromId) {
          return [];
        }

        return (symbol.refs ?? [])
          .filter((ref) => isEdgeType(ref.type))
          .map((ref) => {
            const targetPath = ref.path ?? symbol.path;
            const targetKind = ref.kind && isNodeKind(ref.kind) ? ref.kind : 'variable';
            const targetQualified = ref.qualified_name ?? ref.name;
            const toId = buildNodeId({
              parser_id: ctx.parser_id,
              path: targetPath,
              kind: targetKind,
              qualified_name: targetQualified,
              start_line: ref.location?.start_line,
            });

            return {
              project_id: ctx.project_id,
              analysis_run_id: ctx.analysis_run_id,
              parser_id: ctx.parser_id,
              language,
              from: resolvedFromId,
              to: toId,
              type: ref.type as EdgeType,
              path: symbol.path,
              location: ref.location ?? null,
              metadata: withLayer(null),
              id: buildEdgeId({
                parser_id: ctx.parser_id,
                path: symbol.path,
                type: ref.type,
                from: resolvedFromId,
                to: toId,
              }),
            };
          });
      });

      // Usages (008): emit whenever present; unresolved from/to are skipped
      for (const usage of Array.isArray(parsed.usages) ? parsed.usages : []) {
        if (!MVP_USAGE_EDGE_TYPES.has(usage.type)) {
          continue;
        }
        const fromId = resolveQnToNodeId(usage.from, nodesByQn);
        const toId = resolveQnToNodeId(usage.to, nodesByQn);
        if (!fromId || !toId) {
          continue;
        }
        const path = usage.path ?? '';
        edges.push({
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language,
          from: fromId,
          to: toId,
          type: usage.type as EdgeType,
          path: path || null,
          location: usage.location ?? null,
          metadata: withLayer(usage.metadata ?? null),
          id: buildEdgeId({
            parser_id: ctx.parser_id,
            path: path || usage.from,
            type: usage.type,
            from: fromId,
            to: toId,
          }),
        });
      }

      return { nodes: nodesWithIds, edges };
    },
  };
}

/** @deprecated Prefer createSymbolsModelIngestAdapter */
export const createSymbolsModelV1IngestAdapter = createSymbolsModelIngestAdapter;
