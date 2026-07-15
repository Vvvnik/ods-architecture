import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import styles from '../../styles/graph-view.module.css';

export type SystemNodeData = {
  label: string;
  kind: string;
  isFocus: boolean;
  isExternal: boolean;
};

type SystemFlowNode = Node<SystemNodeData, 'system'>;

export function SystemNode({ data, selected }: NodeProps<SystemFlowNode>) {
  const className = [
    styles.rfNode,
    data.isFocus ? styles.rfNodeFocus : '',
    data.isExternal ? styles.rfNodeExternal : '',
    selected ? styles.rfNodeSelected : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={className}>
      <Handle type="target" position={Position.Left} />
      <span className={styles.kind}>{data.kind}</span>
      <strong>{data.label}</strong>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
