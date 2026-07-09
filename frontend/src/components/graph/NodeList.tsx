import type { GraphNode } from '../../api/graph-types.js';
import { GRAPH_OPEN_FILE } from '../../i18n/ru.js';
import styles from '../../styles/graph.module.css';

interface NodeListProps {
  nodes: GraphNode[];
  selectedNodeId: string | null;
  onSelect: (node: GraphNode) => void;
  onOpenFile?: (node: GraphNode) => void;
}

export function NodeList({ nodes, selectedNodeId, onSelect, onOpenFile }: NodeListProps) {
  if (nodes.length === 0) {
    return <div className={styles.edgeEmpty}>Узлы не найдены на этой странице.</div>;
  }

  return (
    <ul className={styles.nodeList} role="listbox" aria-label="Узлы графа">
      {nodes.map((node) => {
        const selected = node.id === selectedNodeId;
        return (
          <li key={node.id} role="presentation">
            <div
              className={`${styles.nodeItem} ${selected ? styles.nodeItemSelected : ''}`}
            >
              <button
                type="button"
                role="option"
                aria-selected={selected}
                className={styles.nodeSelectBtn}
                onClick={() => onSelect(node)}
              >
                <span className={styles.nodePath}>{node.path}</span>
                <span className={styles.nodeName}>{node.name}</span>
                <span className={styles.nodeKind}>{node.kind}</span>
              </button>
              {onOpenFile && node.path ? (
                <div className={styles.nodeActions}>
                  <button
                    type="button"
                    className={styles.openFileBtn}
                    onClick={() => onOpenFile(node)}
                  >
                    {GRAPH_OPEN_FILE}
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
