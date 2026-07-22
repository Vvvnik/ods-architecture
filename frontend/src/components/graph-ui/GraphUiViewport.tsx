import { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import styles from '../../styles/graph-ui.module.css';
import { UiFrameNode, type UiFrameNodeData } from './UiFrameNode.js';

const COLS = 3;
const NODE_WIDTH = 220;
const GAP_X = 24;
const GAP_Y = 24;
const PAD = 24;

export interface GraphUiFrameCard {
  id: string;
  /** Graph node id for inspector (may differ from RF node id for modal step cards). */
  selectNodeId?: string;
  kind: string;
  kindLabel: string;
  title: string;
  subtitle?: string;
  path?: string;
  canEnter: boolean;
  emphasis?: 'flow';
}

export interface GraphUiViewportProps {
  frames: GraphUiFrameCard[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onEnterNode: (nodeId: string) => void;
}

const nodeTypes = { uiFrame: UiFrameNode };

/** Non-overlapping grid — frames do not move; only the RF viewport pans/zooms. */
function layoutFrameNodes(frames: GraphUiFrameCard[]): Node<UiFrameNodeData, 'uiFrame'>[] {
  return frames.map((frame, index) => {
    const col = index % COLS;
    const row = Math.floor(index / COLS);
    return {
      id: frame.id,
      type: 'uiFrame' as const,
      position: {
        x: PAD + col * (NODE_WIDTH + GAP_X),
        y: PAD + row * (120 + GAP_Y),
      },
      data: {
        kindLabel: frame.kindLabel,
        title: frame.title,
        subtitle: frame.subtitle,
        path: frame.path,
        emphasis: frame.emphasis,
        canEnter: frame.canEnter,
        selectNodeId: frame.selectNodeId ?? frame.id,
      },
      draggable: false,
      connectable: false,
      style: { width: NODE_WIDTH },
    };
  });
}

function GraphUiViewportInner({
  frames,
  selectedNodeId,
  onSelectNode,
  onEnterNode,
}: GraphUiViewportProps) {
  const { fitView } = useReactFlow();
  const laidOut = useMemo(() => layoutFrameNodes(frames), [frames]);
  const [nodes, setNodes, onNodesChange] = useNodesState(laidOut);
  const [edges, , onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setNodes(laidOut);
    const handle = requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 200 });
    });
    return () => cancelAnimationFrame(handle);
  }, [fitView, laidOut, setNodes]);

  const decoratedNodes = useMemo(
    () =>
      nodes.map((node) => {
        const data = node.data as UiFrameNodeData;
        const selectId = data.selectNodeId ?? node.id;
        return {
          ...node,
          selected: selectId === selectedNodeId,
        };
      }),
    [nodes, selectedNodeId],
  );

  const onNodeClick: NodeMouseHandler = (_event, node) => {
    const data = node.data as UiFrameNodeData;
    onSelectNode(data.selectNodeId ?? node.id);
  };

  const onNodeDoubleClick: NodeMouseHandler = (_event, node) => {
    const data = node.data as UiFrameNodeData;
    if (!data.canEnter) return;
    onEnterNode(data.selectNodeId ?? node.id);
  };

  return (
    <ReactFlow
      className={styles.rfCanvas}
      nodes={decoratedNodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
      onPaneClick={() => onSelectNode(null)}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
      panOnDrag
      zoomOnScroll
      zoomOnPinch
      zoomOnDoubleClick={false}
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      fitView
      fitViewOptions={{ padding: 0.15 }}
    >
      <Background gap={16} size={1} color="#e5e7eb" />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

/** Graph UI center: same RF viewport habits as Graph view (pan/zoom/fit), fixed frames. */
export function GraphUiViewport(props: GraphUiViewportProps) {
  return (
    <div className={styles.viewportPane}>
      <ReactFlowProvider>
        <GraphUiViewportInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
