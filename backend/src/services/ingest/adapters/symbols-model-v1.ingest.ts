/**
 * Shared native model schema_version=1 (typescript / csharp / python / cpp parsers):
 * { symbols: [{ name, kind, path, qualified_name?, parent_qualified_name?, signature?, location?, refs? }] }
 * refs: [{ type, name, kind?, path?, qualified_name?, location? }]
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

interface SymbolsModelV1 {
  symbols: SymbolModelEntry[];
}

export function createSymbolsModelV1IngestAdapter(parserId: string, language: string): IngestAdapter {
  return {
    parser_id: parserId,
    supported_schema_versions: ['1'],

    transform(model: unknown, ctx: IngestContext): IngestTransformResult {
      const parsed = model as SymbolsModelV1;
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
          metadata: symbol.parent_qualified_name
            ? { parent_qualified_name: symbol.parent_qualified_name }
            : null,
        }));

      const nodesWithIds = assignStableNodeIds(nodes);
      const nodeIdByQualified = new Map<string, string>();

      for (const node of nodesWithIds) {
        const key = `${node.path}:${node.qualified_name ?? node.name}`;
        nodeIdByQualified.set(key, node.id!);
        const parentQName = node.metadata?.parent_qualified_name;
        if (typeof parentQName === 'string') {
          const parentKey = `${node.path}:${parentQName}`;
          const parentId = nodeIdByQualified.get(parentKey);
          if (parentId) {
            node.parent_id = parentId;
          }
        }
      }

      const edges: GraphEdgeInput[] = symbols.flatMap((symbol) => {
        if (!isNodeKind(symbol.kind)) {
          return [];
        }

        const fromId = buildNodeId({
          parser_id: ctx.parser_id,
          path: symbol.path,
          kind: symbol.kind,
          qualified_name: symbol.qualified_name ?? symbol.name,
          start_line: symbol.location?.start_line,
        });

        const fromNode =
          nodesWithIds.find((node) => node.id === fromId) ??
          nodesWithIds.find(
            (node) =>
              node.path === symbol.path &&
              (node.qualified_name ?? node.name) === (symbol.qualified_name ?? symbol.name),
          );

        const resolvedFromId = fromNode?.id;
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
              metadata: null,
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

      return { nodes: nodesWithIds, edges };
    },
  };
}
