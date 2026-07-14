import type { GraphEdge, GraphNode } from '../api/graph-types.js';

export type GraphLayerFilter = 'code' | 'system' | 'all';

const STORAGE_KEY = 'ods.graph.layerFilter';

export function readGraphLayerFilter(): GraphLayerFilter {
  if (typeof sessionStorage === 'undefined') {
    return 'all';
  }
  const value = sessionStorage.getItem(STORAGE_KEY);
  if (value === 'code' || value === 'system' || value === 'all') {
    return value;
  }
  return 'all';
}

export function writeGraphLayerFilter(value: GraphLayerFilter): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, value);
  }
}

export function nodeLayer(node: GraphNode): 'code' | 'system' {
  const layer = node.metadata?.layer;
  return layer === 'system' ? 'system' : 'code';
}

export function filterNodesByLayer(nodes: GraphNode[], filter: GraphLayerFilter): GraphNode[] {
  if (filter === 'all') {
    return nodes;
  }
  return nodes.filter((node) => nodeLayer(node) === filter);
}

export function filterEdgesByLayer(
  edges: GraphEdge[],
  nodesById: Map<string, GraphNode>,
  filter: GraphLayerFilter,
): GraphEdge[] {
  if (filter === 'all') {
    return edges;
  }
  return edges.filter((edge) => {
    const from = nodesById.get(edge.from);
    const to = nodesById.get(edge.to);
    if (!from || !to) {
      return false;
    }
    const fromLayer = nodeLayer(from);
    const toLayer = nodeLayer(to);
    return fromLayer === filter && toLayer === filter;
  });
}

export function buildNodeIndex(nodes: GraphNode[]): Map<string, GraphNode> {
  return new Map(nodes.map((node) => [node.id, node]));
}
