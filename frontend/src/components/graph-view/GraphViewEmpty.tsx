import { Link } from 'react-router-dom';

import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph-view.module.css';

export interface GraphViewEmptyProps {
  projectId: string;
}

export function GraphViewEmpty({ projectId }: GraphViewEmptyProps) {
  const messages = useMessages();
  return (
    <div className={styles.empty} role="status">
      <p>{messages.GRAPH_VIEW_EMPTY_SYSTEM}</p>
      <Link to={`/projects/${projectId}/graph`}>{messages.GRAPH_MENU_ANALYSIS}</Link>
    </div>
  );
}
