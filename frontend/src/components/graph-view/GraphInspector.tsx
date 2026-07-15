import { Link } from 'react-router-dom';

import type { GraphViewEdge, GraphViewNode } from '../../api/graph-types.js';
import {
  GRAPH_VIEW_ENTER,
  GRAPH_VIEW_OPEN_ANALYSIS,
  graphEdgeTypeLabel,
} from '../../i18n/ru.js';
import styles from '../../styles/graph-view.module.css';

export interface GraphInspectorProps {
  projectId: string;
  node: GraphViewNode | null;
  edges: GraphViewEdge[];
  onEnter: (nodeId: string) => void;
}

export function GraphInspector({ projectId, node, edges, onEnter }: GraphInspectorProps) {
  if (!node) {
    return (
      <aside className={styles.inspector} aria-label="Инспектор">
        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: 0 }}>
          Выберите узел на схеме
        </p>
      </aside>
    );
  }

  const related = edges
    .filter((e) => e.from === node.id || e.to === node.id)
    .slice(0, 8);

  return (
    <aside className={styles.inspector} aria-label="Инспектор">
      <h3>{node.name}</h3>
      <dl>
        <dt>Тип</dt>
        <dd>{node.kind}</dd>
        {node.qualified_name ? (
          <>
            <dt>Имя</dt>
            <dd>{node.qualified_name}</dd>
          </>
        ) : null}
        <dt>Роль на схеме</dt>
        <dd>{node.role}</dd>
      </dl>
      {related.length > 0 ? (
        <dl>
          <dt>Связи</dt>
          {related.map((e) => (
            <dd key={e.id}>
              {graphEdgeTypeLabel(e.type)}:{' '}
              {e.from === node.id ? `→ ${e.to}` : `← ${e.from}`}
            </dd>
          ))}
        </dl>
      ) : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primary}
          onClick={() => onEnter(node.id)}
        >
          {GRAPH_VIEW_ENTER}
        </button>
        <Link to={`/projects/${projectId}/graph?select=${encodeURIComponent(node.id)}`}>
          {GRAPH_VIEW_OPEN_ANALYSIS}
        </Link>
      </div>
    </aside>
  );
}
