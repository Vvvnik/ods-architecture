import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { GraphViewEdge, GraphViewNode } from '../../api/graph-types.js';
import { graphEdgeTypeLabel } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';
import { loadGraphViewport, saveGraphViewport } from '../../utils/graphViewportCache.js';
import { layoutGraph, type GraphLayoutMode } from './layoutGraph.js';
import { SystemNode, type SystemNodeData } from './SystemNode.js';

const CODE_KINDS = new Set([
  'file',
  'module',
  'namespace',
  'class',
  'interface',
  'function',
  'method',
  'property',
  'field',
  'variable',
  'enum',
]);

function isCodeKind(kind: string): boolean {
  return CODE_KINDS.has(kind);
}

const nodeTypes = { system: SystemNode };

function toFlowNodes(viewNodes: GraphViewNode[], viewEdges: GraphViewEdge[]): Node[] {
  const degree = new Map<string, number>();
  for (const node of viewNodes) {
    degree.set(node.id, 0);
  }
  for (const edge of viewEdges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  return viewNodes.map((n) => ({
    id: n.id,
    type: 'system',
    position: { x: 0, y: 0 },
    data: {
      label: n.name,
      kind: n.kind,
      isFocus: n.role === 'focus',
      isExternal: n.role === 'external' || n.stub,
      isCode: n.metadata?.layer === 'code' || isCodeKind(n.kind),
      isGroup: n.kind === 'http_endpoint_group',
      isIsolated: (degree.get(n.id) ?? 0) === 0,
    } satisfies SystemNodeData,
  }));
}

function toFlowEdges(viewEdges: GraphViewEdge[]): Edge[] {
  return viewEdges.map((e) => ({
    id: e.id,
    source: e.from,
    target: e.to,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    data: { edgeType: e.type },
    style: { stroke: '#94a3b8' },
  }));
}

export interface GraphCanvasProps {
  viewNodes: GraphViewNode[];
  viewEdges: GraphViewEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onEnterNode: (nodeId: string) => void;
  /** Stable key for pan/zoom restore (project + focus + layer). */
  viewportKey: string;
  layoutMode?: GraphLayoutMode;
}

function GraphCanvasInner({
  viewNodes,
  viewEdges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  onEnterNode,
  viewportKey,
  layoutMode = 'flow',
}: GraphCanvasProps) {
  useMessages();
  const { fitView, setViewport } = useReactFlow();
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const laidOut = useMemo(() => {
    const nodes = toFlowNodes(viewNodes, viewEdges);
    const edges = toFlowEdges(viewEdges);
    return { nodes: layoutGraph(nodes, edges, layoutMode), edges };
  }, [viewNodes, viewEdges, layoutMode]);

  const layoutSignature = useMemo(
    () =>
      `${viewNodes.map((n) => n.id).join('\0')}|${viewEdges.map((e) => e.id).join('\0')}`,
    [viewNodes, viewEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(laidOut.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(laidOut.edges);

  useEffect(() => {
    setNodes(laidOut.nodes);
    setEdges(laidOut.edges);
  }, [laidOut, setNodes, setEdges]);

  useEffect(() => {
    if (laidOut.nodes.length === 0) {
      return;
    }
    const handle = requestAnimationFrame(() => {
      const saved = loadGraphViewport(viewportKey);
      if (saved) {
        void setViewport(saved, { duration: 0 });
      } else {
        void fitView({ padding: 0.1, duration: 0 });
      }
    });
    return () => cancelAnimationFrame(handle);
  }, [fitView, layoutSignature, setViewport, viewportKey, laidOut.nodes.length]);

  const decoratedEdges = useMemo(() => {
    const incident = new Set<string>();
    if (selectedNodeId) {
      for (const e of edges) {
        if (e.source === selectedNodeId || e.target === selectedNodeId) {
          incident.add(e.id);
        }
      }
    }
    return edges.map((e) => {
      const showLabel =
        e.id === hoveredEdgeId || e.id === selectedEdgeId || incident.has(e.id);
      const label = showLabel
        ? graphEdgeTypeLabel(String((e.data as { edgeType?: string } | undefined)?.edgeType ?? ''))
        : undefined;
      return {
        ...e,
        label,
        selected: e.id === selectedEdgeId,
        style: {
          ...e.style,
          stroke: e.id === selectedEdgeId || incident.has(e.id) ? '#1a56db' : '#94a3b8',
          strokeWidth: e.id === selectedEdgeId ? 2 : 1,
        },
      };
    });
  }, [edges, hoveredEdgeId, selectedEdgeId, selectedNodeId]);

  const decoratedNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    onSelectEdge(null);
    onSelectNode(node.id);
  };

  const onNodeDoubleClick: NodeMouseHandler = (_event, node) => {
    onEnterNode(node.id);
  };

  return (
    <ReactFlow
      nodes={decoratedNodes}
      edges={decoratedEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onEdgeClick={(_event, edge) => {
        onSelectNode(null);
        onSelectEdge(edge.id);
      }}
      onEdgeMouseEnter={(_event, edge) => setHoveredEdgeId(edge.id)}
      onEdgeMouseLeave={() => setHoveredEdgeId(null)}
      onPaneClick={() => {
        onSelectNode(null);
        onSelectEdge(null);
      }}
      onMoveEnd={(_event, viewport) => {
        saveGraphViewport(viewportKey, viewport);
      }}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color="#e5e7eb" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
