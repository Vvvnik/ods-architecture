import { Graph, layout } from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 48;

export type GraphLayoutMode = 'flow' | 'grouped';

type LayoutNodeData = {
  kind?: string;
};

function laneForKind(kind: string | undefined): number {
  if (kind === 'service') return 0;
  if (kind === 'http_endpoint' || kind === 'http_endpoint_group' || kind === 'grpc_method') return 1;
  if (kind === 'message_topic') return 2;
  if (
    kind === 'database' ||
    kind === 'broker' ||
    kind === 'external_api' ||
    kind === 'cache' ||
    kind === 'storage' ||
    kind === 'search' ||
    kind === 'queue'
  ) {
    return 3;
  }
  return 4;
}

function groupedNodes(nodes: Node[], edges: Edge[]): Node[] {
  const laneGap = 340;
  const baseX = -laneGap * 0.5;
  const parkingX = baseX + laneGap * 5;
  const lanes = new Map<number, Node[]>();
  const isolatedByLane = new Map<number, Node[]>();
  const degree = new Map<string, number>();
  for (const node of nodes) {
    degree.set(node.id, 0);
  }
  const nodesById = new Set(nodes.map((node) => node.id));
  for (const edge of edges) {
    if (nodesById.has(edge.source)) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    }
    if (nodesById.has(edge.target)) {
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
  }

  for (const node of nodes) {
    const kind = ((node.data as LayoutNodeData | undefined)?.kind ?? '').toString();
    const lane = laneForKind(kind);
    const isIsolated = (degree.get(node.id) ?? 0) === 0;
    if (isIsolated) {
      const isolated = isolatedByLane.get(lane) ?? [];
      isolated.push(node);
      isolatedByLane.set(lane, isolated);
    } else {
      const list = lanes.get(lane) ?? [];
      list.push(node);
      lanes.set(lane, list);
    }
  }

  const byId = new Map<string, { x: number; y: number }>();
  let parkingCursor = 0;
  for (const [lane, laneNodes] of lanes) {
    laneNodes.sort((a, b) => a.position.y - b.position.y);
    for (let idx = 0; idx < laneNodes.length; idx += 1) {
      const node = laneNodes[idx]!;
      byId.set(node.id, {
        x: baseX + lane * laneGap,
        y: idx * 92,
      });
    }
  }
  for (const [lane, laneNodes] of isolatedByLane) {
    laneNodes.sort((a, b) => a.position.y - b.position.y);
    for (let idx = 0; idx < laneNodes.length; idx += 1) {
      const node = laneNodes[idx]!;
      byId.set(node.id, {
        x: parkingX + lane * 36,
        y: parkingCursor * 86,
      });
      parkingCursor += 1;
    }
  }

  return nodes.map((node) => ({
    ...node,
    position: byId.get(node.id) ?? node.position,
  }));
}

export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  mode: GraphLayoutMode = 'flow',
): Node[] {
  if (nodes.length === 0) {
    return nodes;
  }

  const graph = new Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: mode === 'grouped' ? 'TB' : 'LR',
    nodesep: mode === 'grouped' ? 48 : 40,
    ranksep: mode === 'grouped' ? 72 : 60,
  });

  for (const node of nodes) {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  layout(graph);

  const laidOut = nodes.map((node) => {
    const pos = graph.node(node.id);
    return {
      ...node,
      position: {
        x: (pos?.x ?? 0) - NODE_WIDTH / 2,
        y: (pos?.y ?? 0) - NODE_HEIGHT / 2,
      },
    };
  });

  return mode === 'grouped' ? groupedNodes(laidOut, edges) : laidOut;
}
