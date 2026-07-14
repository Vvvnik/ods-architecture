import type { GraphEdge } from '../../api/graph-types.js';
import { graphEdgeTypeLabel } from '../../i18n/ru.js';
import styles from '../../styles/graph.module.css';

interface EdgeTableProps {
  edges: GraphEdge[];
  isLoading: boolean;
  selectedNodeId: string | null;
}

export function EdgeTable({ edges, isLoading, selectedNodeId }: EdgeTableProps) {
  if (!selectedNodeId) {
    return <div className={styles.edgeEmpty}>Выберите узел, чтобы увидеть связи.</div>;
  }

  if (isLoading) {
    return <div className={styles.loading}>Загрузка рёбер…</div>;
  }

  if (edges.length === 0) {
    return <div className={styles.edgeEmpty}>У выбранного узла нет рёбер.</div>;
  }

  return (
    <table className={styles.edgeTable} role="grid" aria-label="Рёбра выбранного узла">
      <thead>
        <tr>
          <th scope="col">Из → В</th>
          <th scope="col">Тип</th>
          <th scope="col">Файл</th>
        </tr>
      </thead>
      <tbody>
        {edges.map((edge) => (
          <tr key={edge.id}>
            <td>
              <code>{edge.from}</code>
              <br />
              → <code>{edge.to}</code>
            </td>
            <td>{graphEdgeTypeLabel(edge.type)}</td>
            <td>{edge.path ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
