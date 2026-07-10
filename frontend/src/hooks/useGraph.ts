import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { ApiError } from '../api/client.js';
import { getGraphSummary, getNodeEdges, listGraphNodes } from '../api/graph.js';
import type { GraphEdge, GraphNode, GraphSummary } from '../api/graph-types.js';

const DEFAULT_LIMIT = 50;

export type GraphEmptyReason = 'no_project' | 'no_analysis' | 'empty_graph' | 'ingest_failed' | 'error';

export interface GraphEmptyState {
  reason: GraphEmptyReason;
  message?: string;
}

export function useGraph(projectId: string | undefined) {
  const [offset, setOffset] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const limit = DEFAULT_LIMIT;

  const summaryQuery = useQuery({
    queryKey: ['graphSummary', projectId],
    queryFn: () => getGraphSummary(projectId!),
    enabled: Boolean(projectId),
    retry: false,
  });

  const analysisRunId = summaryQuery.data?.analysis_run_id;

  const nodesQuery = useQuery({
    queryKey: ['graphNodes', projectId, analysisRunId, offset, limit],
    queryFn: () =>
      listGraphNodes(projectId!, {
        analysis_run_id: analysisRunId,
        limit,
        offset,
      }),
    enabled: Boolean(projectId && analysisRunId && summaryQuery.isSuccess),
  });

  const edgesQuery = useQuery({
    queryKey: ['graphEdges', projectId, analysisRunId, selectedNodeId],
    queryFn: () =>
      getNodeEdges(projectId!, selectedNodeId!, {
        analysis_run_id: analysisRunId,
        direction: 'both',
        limit: DEFAULT_LIMIT,
      }),
    enabled: Boolean(projectId && analysisRunId && selectedNodeId),
  });

  const selectNode = useCallback((node: GraphNode) => {
    setSelectedNodeId(node.id);
  }, []);

  const goNextPage = useCallback(() => {
    setOffset((current) => current + limit);
    setSelectedNodeId(null);
  }, [limit]);

  const goPrevPage = useCallback(() => {
    setOffset((current) => Math.max(0, current - limit));
    setSelectedNodeId(null);
  }, [limit]);

  const emptyState = resolveEmptyState(
    projectId,
    summaryQuery.data,
    summaryQuery.error,
    nodesQuery.error,
  );
  const isLoading = summaryQuery.isLoading || nodesQuery.isLoading;
  const nodes = nodesQuery.data?.items ?? [];
  const edges: GraphEdge[] = edgesQuery.data?.items ?? [];
  const total = nodesQuery.data?.total ?? 0;
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  return {
    summary: summaryQuery.data as GraphSummary | undefined,
    nodes,
    edges,
    selectedNodeId,
    selectNode,
    offset,
    limit,
    total,
    hasNextPage,
    hasPrevPage,
    goNextPage,
    goPrevPage,
    isLoading,
    isLoadingEdges: edgesQuery.isLoading,
    emptyState,
    nodesError: nodesQuery.error,
    error: summaryQuery.error,
    refetch: () => {
      void summaryQuery.refetch();
      void nodesQuery.refetch();
    },
  };
}

function resolveEmptyState(
  projectId: string | undefined,
  summary: GraphSummary | undefined,
  summaryError: unknown,
  nodesError: unknown,
): GraphEmptyState | null {
  if (!projectId) {
    return { reason: 'no_project' };
  }

  if (summaryError instanceof ApiError) {
    if (summaryError.code === 'graph_not_found') {
      return { reason: 'no_analysis' };
    }
    return { reason: 'error', message: summaryError.message };
  }

  if (nodesError instanceof ApiError) {
    return { reason: 'error', message: nodesError.message };
  }

  if (summaryError || nodesError) {
    return { reason: 'error', message: 'Не удалось загрузить граф' };
  }

  if (summary?.ingest_status === 'partial' && summary.node_count === 0) {
    return { reason: 'ingest_failed' };
  }

  if (summary && summary.node_count === 0) {
    return { reason: 'empty_graph' };
  }

  return null;
}
