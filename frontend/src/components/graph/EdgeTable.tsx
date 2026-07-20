import type { GraphEdge } from '../../api/graph-types.js';
import { graphEdgeTypeLabel } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph.module.css';
import { shortGraphRefLabel } from '../../utils/graphNodeLabel.js';

interface EdgeTableProps {
  edges: GraphEdge[];
  isLoading: boolean;
  selectedNodeId: string | null;
}

export function EdgeTable({ edges, isLoading, selectedNodeId }: EdgeTableProps) {
  const messages = useMessages();
  if (!selectedNodeId) {
    return <div className={styles.edgeEmpty}>{messages.EDGE_SELECT_PROMPT}</div>;
  }

  if (isLoading) {
    return <div className={styles.loading}>{messages.EDGE_LOADING}</div>;
  }

  if (edges.length === 0) {
    return <div className={styles.edgeEmpty}>{messages.EDGE_EMPTY}</div>;
  }

  return (
    <table className={styles.edgeTable} role="grid" aria-label={messages.EDGE_TABLE_ARIA}>
      <thead>
        <tr>
          <th scope="col">{messages.TABLE_FROM_TO}</th>
          <th scope="col">{messages.TABLE_TYPE}</th>
          <th scope="col">{messages.TABLE_FILE}</th>
        </tr>
      </thead>
      <tbody>
        {edges.map((edge) => (
          <tr key={edge.id}>
            <td>
              <code title={edge.from}>{shortGraphRefLabel(edge.from)}</code>
              <br />
              → <code title={edge.to}>{shortGraphRefLabel(edge.to)}</code>
            </td>
            <td>{graphEdgeTypeLabel(edge.type)}</td>
            <td>{edge.path ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
