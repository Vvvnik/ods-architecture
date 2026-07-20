import { AppError } from '../domain/errors.js';
import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import { resolveLatestGraphRunId } from './graph-run-resolver.js';

export type GraphNodePublic = Omit<GraphNodeDocument, 'ingested_at'> & {
  has_children?: boolean;
};
export type GraphEdgePublic = Omit<GraphEdgeDocument, 'ingested_at'>;

export interface GraphSummary {
  project_id: string;
  analysis_run_id: string;
  ingest_status?: 'success' | 'partial';
  node_count: number;
  edge_count: number;
  languages: string[];
}

export interface GraphNodeList {
  items: GraphNodePublic[];
  total: number;
  limit: number;
  offset: number;
  analysis_run_id: string;
}

export interface GraphEdgeList {
  items: GraphEdgePublic[];
  total?: number;
  limit?: number;
  offset?: number;
  analysis_run_id: string;
}

export interface GraphSearchResult {
  q: string;
  nodes: GraphNodeList;
  edges: GraphEdgeList;
}

export interface GraphNodeAncestors {
  node_id: string;
  ancestors: GraphNodePublic[];
}

export interface FileGraphResponse {
  path: string;
  analysis_run_id: string;
  nodes: GraphNodePublic[];
  edges: GraphEdgePublic[];
}

export class GraphService {
  constructor(
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
  ) {}

  async resolveLatestAnalysisRunId(projectId: string): Promise<string | null> {
    const runs = await this.analysisRunRepository.listByProjectId(projectId, 50);
    return resolveLatestGraphRunId(runs, (runId) =>
      this.graphNodeRepository.countByProjectAndRun(projectId, runId),
    );
  }

  async getSummary(
    projectId: string,
    analysisRunId?: string,
  ): Promise<GraphSummary> {
    const { runId, ingestStatus } = await this.resolveRun(projectId, analysisRunId);

    const [nodeCount, edgeCount, languages] = await Promise.all([
      this.graphNodeRepository.countByProjectAndRun(projectId, runId),
      this.graphEdgeRepository.countByProjectAndRun(projectId, runId),
      this.graphNodeRepository.listDistinctLanguages(projectId, runId),
    ]);

    if (nodeCount === 0 && edgeCount === 0 && !analysisRunId) {
      throw new AppError('graph_not_found', undefined, 404);
    }

    return {
      project_id: projectId,
      analysis_run_id: runId,
      ingest_status:
        ingestStatus === 'success' || ingestStatus === 'partial' ? ingestStatus : undefined,
      node_count: nodeCount,
      edge_count: edgeCount,
      languages,
    };
  }

  async listNodes(
    projectId: string,
    options: {
      analysisRunId?: string;
      path?: string;
      kind?: string;
      parentId?: string | null | 'root';
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<GraphNodeList> {
    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const { items, total } = await this.graphNodeRepository.listByProjectAndRun(
      projectId,
      runId,
      {
        path: options.path,
        kind: options.kind,
        parentId: options.parentId,
        limit,
        offset,
      },
    );

    const hasChildren = await this.graphNodeRepository.hasChildrenMap(
      projectId,
      runId,
      items.map((node) => node.id),
    );

    return {
      items: items.map((node) => ({
        ...toPublicNode(node),
        has_children: hasChildren.get(node.id) ?? false,
      })),
      total,
      limit,
      offset,
      analysis_run_id: runId,
    };
  }

  async getNodeAncestors(
    projectId: string,
    nodeId: string,
    analysisRunId?: string,
  ): Promise<GraphNodeAncestors> {
    const { runId } = await this.resolveRun(projectId, analysisRunId);
    const node = await this.graphNodeRepository.getByLogicalId(projectId, runId, nodeId);
    if (!node) {
      throw new AppError('graph_node_not_found', undefined, 404);
    }

    const ancestors: GraphNodePublic[] = [];
    let currentParentId = node.parent_id ?? null;
    const guard = new Set<string>();

    while (currentParentId && !guard.has(currentParentId)) {
      guard.add(currentParentId);
      const parent = await this.graphNodeRepository.getByLogicalId(
        projectId,
        runId,
        currentParentId,
      );
      if (!parent) {
        break;
      }
      ancestors.unshift(toPublicNode(parent));
      currentParentId = parent.parent_id ?? null;
    }

    return { node_id: nodeId, ancestors };
  }

  async search(
    projectId: string,
    q: string,
    options: { analysisRunId?: string; limit?: number; offset?: number } = {},
  ): Promise<GraphSearchResult> {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      throw new AppError(
        'validation_error',
        'Enter at least 2 characters to search',
        400,
      );
    }

    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;

    const [nodes, edges] = await Promise.all([
      this.graphNodeRepository.search(projectId, runId, trimmed, { limit, offset }),
      this.graphEdgeRepository.search(projectId, runId, trimmed, { limit, offset }),
    ]);

    return {
      q: trimmed,
      nodes: {
        items: nodes.items.map(toPublicNode),
        total: nodes.total,
        limit,
        offset,
        analysis_run_id: runId,
      },
      edges: {
        items: edges.items.map(toPublicEdge),
        total: edges.total,
        limit,
        offset,
        analysis_run_id: runId,
      },
    };
  }

  async getNodeById(
    projectId: string,
    nodeId: string,
    analysisRunId?: string,
  ): Promise<GraphNodePublic> {
    const { runId } = await this.resolveRun(projectId, analysisRunId);
    const node = await this.graphNodeRepository.getByLogicalId(projectId, runId, nodeId);

    if (!node) {
      throw new AppError('graph_node_not_found', undefined, 404);
    }

    return toPublicNode(node);
  }

  async getNodeEdges(
    projectId: string,
    nodeId: string,
    options: {
      analysisRunId?: string;
      direction?: 'outgoing' | 'incoming' | 'both';
      limit?: number;
    } = {},
  ): Promise<GraphEdgeList> {
    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const node = await this.graphNodeRepository.getByLogicalId(projectId, runId, nodeId);

    if (!node) {
      throw new AppError('graph_node_not_found', undefined, 404);
    }

    const edges = await this.graphEdgeRepository.listByNode(
      projectId,
      runId,
      nodeId,
      options.direction ?? 'both',
      options.limit ?? 50,
    );

    return {
      items: edges.map(toPublicEdge),
      analysis_run_id: runId,
    };
  }

  async getFileDependencies(
    projectId: string,
    filePath: string,
    options: { analysisRunId?: string; limit?: number } = {},
  ): Promise<FileGraphResponse> {
    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const limit = options.limit ?? 50;

    const { items: nodes } = await this.graphNodeRepository.listByProjectAndRun(
      projectId,
      runId,
      { path: filePath, limit },
    );

    const nodeIds = nodes.map((node) => node.id);
    const edges = await this.graphEdgeRepository.listForFile(
      projectId,
      runId,
      filePath,
      nodeIds,
      limit,
    );

    return {
      path: filePath,
      analysis_run_id: runId,
      nodes: nodes.map(toPublicNode),
      edges: edges.map(toPublicEdge),
    };
  }

  private async resolveRun(
    projectId: string,
    analysisRunId?: string,
  ): Promise<{ runId: string; ingestStatus: string | null }> {
    if (analysisRunId) {
      const run = await this.analysisRunRepository.getById(analysisRunId);
      if (!run || run.project_id !== projectId) {
        throw new AppError('analysis_run_not_found', undefined, 404);
      }

      return { runId: run.id, ingestStatus: run.ingest_status ?? null };
    }

    const latestRunId = await this.resolveLatestAnalysisRunId(projectId);
    if (!latestRunId) {
      throw new AppError('graph_not_found', undefined, 404);
    }

    const run = await this.analysisRunRepository.getById(latestRunId);
    return { runId: latestRunId, ingestStatus: run?.ingest_status ?? null };
  }
}

function toPublicNode(node: GraphNodeDocument): GraphNodePublic {
  const { ingested_at: _ingestedAt, ...rest } = node;
  return rest;
}

function toPublicEdge(edge: GraphEdgeDocument): GraphEdgePublic {
  const { ingested_at: _ingestedAt, ...rest } = edge;
  return rest;
}
