import { Link } from 'react-router-dom';

import type { GraphEmptyState as GraphEmptyStateModel } from '../../hooks/useGraph.js';
import {
  GRAPH_EMPTY_INGEST_FAILED_TEXT,
  GRAPH_EMPTY_INGEST_FAILED_TITLE,
  GRAPH_EMPTY_NO_ANALYSIS_ACTION,
  GRAPH_EMPTY_NO_ANALYSIS_TEXT,
  GRAPH_EMPTY_NO_ANALYSIS_TITLE,
  GRAPH_EMPTY_NO_NODES_TEXT,
  GRAPH_EMPTY_NO_NODES_TITLE,
  GRAPH_EMPTY_NO_PROJECT_TEXT,
  GRAPH_EMPTY_NO_PROJECT_TITLE,
} from '../../i18n/ru.js';
import styles from '../../styles/graph.module.css';

interface GraphEmptyStateProps {
  state: GraphEmptyStateModel;
  workspaceHref?: string;
}

export function GraphEmptyState({ state, workspaceHref }: GraphEmptyStateProps) {
  if (state.reason === 'no_project') {
    return (
      <div className={styles.emptyState}>
        <h3>{GRAPH_EMPTY_NO_PROJECT_TITLE}</h3>
        <p>{GRAPH_EMPTY_NO_PROJECT_TEXT}</p>
        <Link to="/projects">Перейти к проектам</Link>
      </div>
    );
  }

  if (state.reason === 'no_analysis') {
    return (
      <div className={styles.emptyState}>
        <h3>{GRAPH_EMPTY_NO_ANALYSIS_TITLE}</h3>
        <p>{GRAPH_EMPTY_NO_ANALYSIS_TEXT}</p>
        {workspaceHref ? <Link to={workspaceHref}>{GRAPH_EMPTY_NO_ANALYSIS_ACTION}</Link> : null}
      </div>
    );
  }

  if (state.reason === 'empty_graph') {
    return (
      <div className={styles.emptyState}>
        <h3>{GRAPH_EMPTY_NO_NODES_TITLE}</h3>
        <p>{GRAPH_EMPTY_NO_NODES_TEXT}</p>
      </div>
    );
  }

  if (state.reason === 'ingest_failed') {
    return (
      <div className={styles.emptyState}>
        <h3>{GRAPH_EMPTY_INGEST_FAILED_TITLE}</h3>
        <p>{GRAPH_EMPTY_INGEST_FAILED_TEXT}</p>
        {workspaceHref ? <Link to={workspaceHref}>{GRAPH_EMPTY_NO_ANALYSIS_ACTION}</Link> : null}
      </div>
    );
  }

  return (
    <div className={styles.emptyState}>
      <h3>Ошибка загрузки графа</h3>
      <p>{state.message ?? 'Повторите попытку позже.'}</p>
    </div>
  );
}
