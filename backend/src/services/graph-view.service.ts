import { AppError } from '../domain/errors.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import { resolveLatestGraphRunId } from './graph-run-resolver.js';
import { isCodeKind, isCodeLayerNode } from './graph-view-affiliation.js';
import { buildViewSlicePure } from './graph-view-slice.js';
import {
  CODE_KINDS_LIST,
  DEFAULT_MAX_EDGES,
  DEFAULT_MAX_NODES,
  SYSTEM_INSIDE_KINDS,
  SYSTEM_PEER_KINDS,
  type GraphViewLayer,
  type GraphViewSlice,
} from './graph-view.types.js';

const LOAD_KINDS = [...SYSTEM_PEER_KINDS, ...SYSTEM_INSIDE_KINDS];

/**
 * Loader strategy for code under service (012 T009 / research R5):
 * **(A)** ES path-segment wildcard by service name + CODE_KINDS_LIST.
 */
const CODE_LOAD_STRATEGY: 'A' | 'B' = 'A';

export class GraphViewService {
  constructor(
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
  ) {}

  async getView(
    projectId: string,
    options: {
      analysisRunId?: string;
      focus?: string | null;
      resolveFrom?: string | null;
      layer?: GraphViewLayer;
      maxNodes?: number;
      maxEdges?: number;
    } = {},
  ): Promise<GraphViewSlice> {
    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const maxNodes = clamp(options.maxNodes ?? DEFAULT_MAX_NODES, 1, DEFAULT_MAX_NODES);
    const maxEdges = clamp(options.maxEdges ?? DEFAULT_MAX_EDGES, 1, DEFAULT_MAX_EDGES);

    const allNodes = await this.loadRelevantNodes(projectId, runId, options);
    const seedIds = new Set(allNodes.map((n) => n.id));
    const edges = await this.graphEdgeRepository.listIncidentToNodes(
      projectId,
      runId,
      [...seedIds],
      Math.max(maxEdges * 3, 2000),
    );

    const missing = new Set<string>();
    for (const edge of edges) {
      if (!seedIds.has(edge.from)) {
        missing.add(edge.from);
      }
      if (!seedIds.has(edge.to)) {
        missing.add(edge.to);
      }
    }
    for (const id of missing) {
      const node = await this.graphNodeRepository.getByLogicalId(projectId, runId, id);
      if (node) {
        allNodes.push(node);
        seedIds.add(node.id);
      }
    }

    return buildViewSlicePure({
      projectId,
      analysisRunId: runId,
      allNodes,
      allEdges: edges,
      focusId: options.focus,
      resolveFromId: options.resolveFrom,
      layer: options.layer ?? 'system',
      maxNodes,
      maxEdges,
    });
  }

  private async loadRelevantNodes(
    projectId: string,
    runId: string,
    options: {
      resolveFrom?: string | null;
      focus?: string | null;
      layer?: GraphViewLayer;
    },
  ): Promise<GraphNodeDocument[]> {
    const { items } = await this.graphNodeRepository.listByKinds(
      projectId,
      runId,
      LOAD_KINDS,
      { limit: 2000, offset: 0 },
    );
    const byId = new Map(items.map((n) => [n.id, n]));

    for (const extraId of [options.focus, options.resolveFrom]) {
      if (!extraId || byId.has(extraId)) {
        continue;
      }
      const node = await this.graphNodeRepository.getByLogicalId(projectId, runId, extraId);
      if (node) {
        byId.set(node.id, node);
        let parentId = node.parent_id;
        const guard = new Set<string>();
        while (parentId && !guard.has(parentId)) {
          guard.add(parentId);
          if (byId.has(parentId)) {
            break;
          }
          const parent = await this.graphNodeRepository.getByLogicalId(
            projectId,
            runId,
            parentId,
          );
          if (!parent) {
            break;
          }
          byId.set(parent.id, parent);
          parentId = parent.parent_id;
        }
      }
    }

    const focus = options.focus ? byId.get(options.focus) : undefined;
    const resolveFrom = options.resolveFrom
      ? byId.get(options.resolveFrom)
      : undefined;

    const needCode =
      options.layer === 'code' ||
      (focus != null && (isCodeLayerNode(focus) || isCodeKind(focus.kind))) ||
      (resolveFrom != null && (isCodeLayerNode(resolveFrom) || isCodeKind(resolveFrom.kind)));

    if (needCode && CODE_LOAD_STRATEGY === 'A') {
      const segments = new Set<string>();
      if (focus?.kind === 'service') {
        segments.add(focus.name);
      }
      if (resolveFrom && isCodeLayerNode(resolveFrom) && resolveFrom.path) {
        const parts = resolveFrom.path.replace(/\\/g, '/').split('/').filter(Boolean);
        if (parts[0]) {
          segments.add(parts[0]);
        }
      }
      if (focus && isCodeLayerNode(focus) && focus.path) {
        const parts = focus.path.replace(/\\/g, '/').split('/').filter(Boolean);
        if (parts[0]) {
          segments.add(parts[0]);
        }
      }
      // Also load all service-named segments present in system peers
      for (const n of byId.values()) {
        if (n.kind === 'service' && options.layer === 'code') {
          segments.add(n.name);
        }
      }

      for (const segment of segments) {
        const { items: codeItems } = await this.graphNodeRepository.listByPathSegment(
          projectId,
          runId,
          segment,
          { limit: 2000, kinds: [...CODE_KINDS_LIST] },
        );
        for (const node of codeItems) {
          byId.set(node.id, node);
        }
      }

      // Children of focused code node may not match path segment of root — load by parent
      if (focus && isCodeLayerNode(focus)) {
        const { items: children } = await this.graphNodeRepository.listByProjectAndRun(
          projectId,
          runId,
          { parentId: focus.id, limit: 500, offset: 0 },
        );
        for (const child of children) {
          byId.set(child.id, child);
        }
      }
    }

    return [...byId.values()];
  }

  private async resolveRun(
    projectId: string,
    analysisRunId?: string,
  ): Promise<{ runId: string }> {
    if (analysisRunId) {
      const run = await this.analysisRunRepository.getById(analysisRunId);
      if (!run || run.project_id !== projectId) {
        throw new AppError('analysis_run_not_found', undefined, 404);
      }
      return { runId: run.id };
    }

    const runs = await this.analysisRunRepository.listByProjectId(projectId, 50);
    const latestRunId = await resolveLatestGraphRunId(runs, (runId) =>
      this.graphNodeRepository.countByProjectAndRun(projectId, runId),
    );
    if (!latestRunId) {
      throw new AppError('graph_not_found', undefined, 404);
    }
    return { runId: latestRunId };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
