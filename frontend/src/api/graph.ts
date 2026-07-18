import { apiFetch } from './client.js';
import type {
  FileGraphResponse,
  GetGraphViewParams,
  GraphEdgeList,
  GraphNodeAncestors,
  GraphNodeList,
  GraphSearchResult,
  GraphSummary,
  GraphViewSlice,
  ListGraphNodeEdgesParams,
  ListGraphNodesParams,
} from './graph-types.js';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export async function getGraphSummary(
  projectId: string,
  analysisRunId?: string,
): Promise<GraphSummary> {
  const { data } = await apiFetch<GraphSummary>(
    `/projects/${projectId}/graph/summary${buildQuery({ analysis_run_id: analysisRunId })}`,
  );
  return data;
}

export async function listGraphNodes(
  projectId: string,
  params: ListGraphNodesParams = {},
): Promise<GraphNodeList> {
  const { data } = await apiFetch<GraphNodeList>(
    `/projects/${projectId}/graph/nodes${buildQuery({
      analysis_run_id: params.analysis_run_id,
      path: params.path,
      kind: params.kind,
      parent_id: params.parent_id,
      limit: params.limit,
      offset: params.offset,
    })}`,
  );
  return data;
}

export async function getGraphNodeAncestors(
  projectId: string,
  nodeId: string,
  analysisRunId?: string,
): Promise<GraphNodeAncestors> {
  const { data } = await apiFetch<GraphNodeAncestors>(
    `/projects/${projectId}/graph/nodes/${encodeURIComponent(nodeId)}/ancestors${buildQuery({
      analysis_run_id: analysisRunId,
    })}`,
  );
  return data;
}

export async function searchGraph(
  projectId: string,
  params: { q: string; analysis_run_id?: string; limit?: number; offset?: number },
): Promise<GraphSearchResult> {
  const { data } = await apiFetch<GraphSearchResult>(
    `/projects/${projectId}/graph/search${buildQuery({
      q: params.q,
      analysis_run_id: params.analysis_run_id,
      limit: params.limit,
      offset: params.offset,
    })}`,
  );
  return data;
}

export async function getNodeEdges(
  projectId: string,
  nodeId: string,
  params: ListGraphNodeEdgesParams = {},
): Promise<GraphEdgeList> {
  const { data } = await apiFetch<GraphEdgeList>(
    `/projects/${projectId}/graph/nodes/${encodeURIComponent(nodeId)}/edges${buildQuery({
      analysis_run_id: params.analysis_run_id,
      direction: params.direction,
      limit: params.limit,
    })}`,
  );
  return data;
}

export async function getFileDependencies(
  projectId: string,
  filePath: string,
  params: { analysis_run_id?: string; limit?: number } = {},
): Promise<FileGraphResponse> {
  const encodedPath = filePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const { data } = await apiFetch<FileGraphResponse>(
    `/projects/${projectId}/graph/files/${encodedPath}/dependencies${buildQuery({
      analysis_run_id: params.analysis_run_id,
      limit: params.limit,
    })}`,
  );
  return data;
}

export async function getGraphView(
  projectId: string,
  params: GetGraphViewParams = {},
): Promise<GraphViewSlice> {
  const { data } = await apiFetch<GraphViewSlice>(
    `/projects/${projectId}/graph/view${buildQuery({
      analysis_run_id: params.analysis_run_id,
      focus: params.focus,
      resolve_from: params.resolve_from,
      layer: params.layer,
      max_nodes: params.max_nodes,
      max_edges: params.max_edges,
    })}`,
  );
  return data;
}
