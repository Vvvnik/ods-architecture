import { memo } from 'react';
import { type Node, type NodeProps } from '@xyflow/react';

import styles from '../../styles/graph-ui.module.css';

export type UiFrameNodeData = {
  kindLabel: string;
  title: string;
  subtitle?: string;
  path?: string;
  emphasis?: 'flow';
  canEnter: boolean;
  selectNodeId?: string;
};

export type UiFrameFlowNode = Node<UiFrameNodeData, 'uiFrame'>;

function UiFrameNodeComponent({ data, selected }: NodeProps<UiFrameFlowNode>) {
  const className = [
    styles.rfFrame,
    data.canEnter ? styles.rfFrameEnterable : '',
    data.emphasis === 'flow' ? styles.rfFrameFlow : '',
    selected ? styles.rfFrameSelected : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <span className={styles.frameKind}>{data.kindLabel}</span>
      <strong className={styles.frameName}>{data.title}</strong>
      {data.subtitle ? <span className={styles.frameSubtitle}>{data.subtitle}</span> : null}
      {data.path ? <span className={styles.framePath}>{data.path}</span> : null}
    </div>
  );
}

export const UiFrameNode = memo(UiFrameNodeComponent);
