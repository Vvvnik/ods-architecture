import { useQuery } from '@tanstack/react-query';

import { getFileDependencies } from '../../api/graph.js';
import { ApiError } from '../../api/client.js';
import { graphEdgeTypeLabel } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph.module.css';
import { shortGraphRefLabel } from '../../utils/graphNodeLabel.js';

interface FileGraphPanelProps {
  projectId: string;
  filePath: string;
}

export function FileGraphPanel({ projectId, filePath }: FileGraphPanelProps) {
  const messages = useMessages();
  const {
    FILE_GRAPH_PANEL_EDGES_TITLE,
    FILE_GRAPH_PANEL_EMPTY,
    FILE_GRAPH_PANEL_LOADING,
    FILE_GRAPH_PANEL_NODES_TITLE,
    FILE_GRAPH_PANEL_NOT_FOUND,
    FILE_GRAPH_PANEL_TITLE,
  } = messages;
  const { data, isLoading, error } = useQuery({
    queryKey: ['fileGraph', projectId, filePath],
    queryFn: () => getFileDependencies(projectId, filePath),
    enabled: Boolean(projectId && filePath),
    retry: false,
  });

  if (isLoading) {
    return (
      <section className={styles.fileGraphPanel} aria-label={FILE_GRAPH_PANEL_TITLE}>
        <h3 className={styles.fileGraphTitle}>{FILE_GRAPH_PANEL_TITLE}</h3>
        <p className={styles.fileGraphMuted}>{FILE_GRAPH_PANEL_LOADING}</p>
      </section>
    );
  }

  if (error instanceof ApiError && error.code === 'graph_not_found') {
    return (
      <section className={styles.fileGraphPanel} aria-label={FILE_GRAPH_PANEL_TITLE}>
        <h3 className={styles.fileGraphTitle}>{FILE_GRAPH_PANEL_TITLE}</h3>
        <p className={styles.fileGraphMuted}>{FILE_GRAPH_PANEL_NOT_FOUND}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.fileGraphPanel} aria-label={FILE_GRAPH_PANEL_TITLE}>
        <h3 className={styles.fileGraphTitle}>{FILE_GRAPH_PANEL_TITLE}</h3>
        <p className={styles.fileGraphMuted} role="alert">
          {error instanceof ApiError ? error.message : FILE_GRAPH_PANEL_NOT_FOUND}
        </p>
      </section>
    );
  }

  const nodes = data?.nodes ?? [];
  const edges = data?.edges ?? [];

  if (nodes.length === 0 && edges.length === 0) {
    return (
      <section className={styles.fileGraphPanel} aria-label={FILE_GRAPH_PANEL_TITLE}>
        <h3 className={styles.fileGraphTitle}>{FILE_GRAPH_PANEL_TITLE}</h3>
        <p className={styles.fileGraphMuted}>{FILE_GRAPH_PANEL_EMPTY}</p>
      </section>
    );
  }

  return (
    <section className={styles.fileGraphPanel} aria-label={FILE_GRAPH_PANEL_TITLE}>
      <h3 className={styles.fileGraphTitle}>{FILE_GRAPH_PANEL_TITLE}</h3>

      <div className={styles.fileGraphSection}>
        <h4 className={styles.fileGraphSectionTitle}>{FILE_GRAPH_PANEL_NODES_TITLE}</h4>
        <ul className={styles.fileGraphNodeList}>
          {nodes.map((node) => (
            <li key={node.id} className={styles.fileGraphNodeItem}>
              <span className={styles.nodeName}>{node.name}</span>
              <span className={styles.nodeKind}>{node.kind}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.fileGraphSection}>
        <h4 className={styles.fileGraphSectionTitle}>{FILE_GRAPH_PANEL_EDGES_TITLE}</h4>
        {edges.length === 0 ? (
          <p className={styles.fileGraphMuted}>{FILE_GRAPH_PANEL_EMPTY}</p>
        ) : (
          <table className={styles.fileGraphEdgeTable}>
            <thead>
              <tr>
                <th>{messages.TABLE_TYPE}</th>
                <th>{messages.TABLE_FROM}</th>
                <th>{messages.TABLE_TO}</th>
              </tr>
            </thead>
            <tbody>
              {edges.map((edge) => (
                <tr key={edge.id}>
                  <td>{graphEdgeTypeLabel(edge.type)}</td>
                  <td title={edge.from}>{shortGraphRefLabel(edge.from)}</td>
                  <td title={edge.to}>{shortGraphRefLabel(edge.to)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
