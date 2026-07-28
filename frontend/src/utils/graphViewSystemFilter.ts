import type { GraphViewEdge, GraphViewNode, GraphViewSlice } from '../api/graph-types.js';

export type GraphViewSystemFilter = 'all' | 'http' | 'grpc' | 'rpc_bus' | 'infra';

function edgeProtocol(edge: GraphViewEdge): string | null {
  const protocol = edge.metadata?.protocol;
  return typeof protocol === 'string' ? protocol.toLowerCase() : null;
}

function matchesFilter(edge: GraphViewEdge, filter: GraphViewSystemFilter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'http') {
    return edge.type === 'http_calls' && edgeProtocol(edge) === 'http';
  }
  if (filter === 'grpc') {
    const protocol = edgeProtocol(edge);
    return protocol === 'grpc' || (edge.type === 'http_calls' && protocol === 'grpc');
  }
  if (filter === 'rpc_bus') {
    return edge.type === 'rpc_handles' || edge.type === 'publishes' || edge.type === 'consumes';
  }
  return (
    edge.type === 'depends_on' ||
    edge.type === 'connects_to' ||
    edge.type === 'project_reference' ||
    edge.type === 'documents' ||
    edge.type === 'exposes'
  );
}

export function normalizeGraphViewSystemFilter(
  value: string | null | undefined,
): GraphViewSystemFilter {
  if (value === 'http' || value === 'grpc' || value === 'rpc_bus' || value === 'infra') {
    return value;
  }
  return 'all';
}

export function availableGraphViewSystemFilters(slice: GraphViewSlice): GraphViewSystemFilter[] {
  if (slice.layer !== 'system') {
    return ['all'];
  }
  const options: GraphViewSystemFilter[] = ['all'];
  const has = (filter: GraphViewSystemFilter): boolean =>
    slice.edges.some((edge) => matchesFilter(edge, filter));

  if (has('http')) options.push('http');
  if (has('grpc')) options.push('grpc');
  if (has('rpc_bus')) options.push('rpc_bus');
  if (has('infra')) options.push('infra');
  return options;
}

export function applyGraphViewSystemFilter(
  slice: GraphViewSlice,
  filter: GraphViewSystemFilter,
): GraphViewSlice {
  if (slice.layer !== 'system' || filter === 'all') {
    return slice;
  }

  const edges = slice.edges.filter((edge) => matchesFilter(edge, filter));
  const nodeIds = new Set<string>();
  for (const edge of edges) {
    nodeIds.add(edge.from);
    nodeIds.add(edge.to);
  }
  if (slice.focus_id) {
    nodeIds.add(slice.focus_id);
  }

  const nodes = slice.nodes.filter((node) => nodeIds.has(node.id));
  const byId = new Set(nodes.map((node) => node.id));
  const missingIds = [...nodeIds].filter((id) => !byId.has(id));
  const stubs: GraphViewNode[] = missingIds.map((id) => ({
    id,
    project_id: slice.project_id,
    analysis_run_id: slice.analysis_run_id,
    parser_id: 'stub',
    kind: 'unknown',
    name: id,
    qualified_name: id,
    language: 'system',
    path: '',
    metadata: { layer: 'system' },
    role: 'external',
    stub: true,
  }));

  return {
    ...slice,
    nodes: [...nodes, ...stubs],
    edges,
    counts: {
      ...slice.counts,
      nodes: nodes.length + stubs.length,
      edges: edges.length,
    },
  };
}
