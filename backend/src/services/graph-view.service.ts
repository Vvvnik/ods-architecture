import { AppError } from '../domain/errors.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import { resolveLatestGraphRunId } from './graph-run-resolver.js';
import { buildViewSlicePure } from './graph-view-slice.js';
import {
  DEFAULT_MAX_EDGES,
  DEFAULT_MAX_NODES,
  SYSTEM_INSIDE_KINDS,
  SYSTEM_PEER_KINDS,
  type GraphViewSlice,
} from './graph-view.types.js';

const LOAD_KINDS = [
  ...SYSTEM_PEER_KINDS,
  ...SYSTEM_INSIDE_KINDS,
];

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
      Math.max(maxEdges * 3, 1000),
    );

    // Load any external endpoints absent from kind filter
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
      maxNodes,
      maxEdges,
    });
  }

  private async loadRelevantNodes(
    projectId: string,
    runId: string,
    options: { resolveFrom?: string | null; focus?: string | null },
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
        // walk parents for resolve
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
