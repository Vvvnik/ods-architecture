import { Link } from 'react-router-dom';

import { GRAPH_MENU_ANALYSIS, GRAPH_VIEW_EMPTY_SYSTEM } from '../../i18n/ru.js';
import styles from '../../styles/graph-view.module.css';

export interface GraphViewEmptyProps {
  projectId: string;
}

export function GraphViewEmpty({ projectId }: GraphViewEmptyProps) {
  return (
    <div className={styles.empty} role="status">
      <p>{GRAPH_VIEW_EMPTY_SYSTEM}</p>
      <Link to={`/projects/${projectId}/graph`}>{GRAPH_MENU_ANALYSIS}</Link>
    </div>
  );
}
