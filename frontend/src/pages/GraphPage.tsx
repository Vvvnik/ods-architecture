import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSession } from '../context/SessionContext.js';
import { EdgeTable } from '../components/graph/EdgeTable.js';
import { GraphEmptyState } from '../components/graph/GraphEmptyState.js';
import { NodeList } from '../components/graph/NodeList.js';
import { useGraph } from '../hooks/useGraph.js';
import type { GraphNode } from '../api/graph-types.js';
import {
  GRAPH_ELEMENT_STALE_WARNING,
  GRAPH_PAGE_EDGES_TITLE,
  GRAPH_PAGE_NODES_TITLE,
  GRAPH_PAGE_TITLE,
} from '../i18n/ru.js';
import styles from '../styles/graph.module.css';

export function GraphPage() {
  const navigate = useNavigate();
  const { activeProjectId } = useSession();
  const graph = useGraph(activeProjectId ?? undefined);
  const workspaceHref = activeProjectId ? `/projects/${activeProjectId}` : undefined;
  const [toast, setToast] = useState<string | null>(null);

  const handleOpenFile = (node: GraphNode) => {
    if (!activeProjectId || !node.path) {
      return;
    }

    if (!node.element_id) {
      setToast(GRAPH_ELEMENT_STALE_WARNING);
    }

    const params = new URLSearchParams({ highlightPath: node.path });
    navigate(`/projects/${activeProjectId}?${params.toString()}`);
  };

  if (graph.emptyState) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2 className={styles.title}>{GRAPH_PAGE_TITLE}</h2>
        </div>
        <GraphEmptyState state={graph.emptyState} workspaceHref={workspaceHref} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>{GRAPH_PAGE_TITLE}</h2>
        {graph.summary ? (
          <div className={styles.meta}>
            Снимок: {graph.summary.analysis_run_id.slice(0, 8)}… · узлов: {graph.summary.node_count} ·
            рёбер: {graph.summary.edge_count}
            {graph.summary.languages?.length ? ` · ${graph.summary.languages.join(', ')}` : ''}
          </div>
        ) : null}
      </div>

      {graph.isLoading ? (
        <div className={styles.loading}>Загрузка графа…</div>
      ) : (
        <div className={styles.layout}>
          <section className={styles.panel} aria-label={GRAPH_PAGE_NODES_TITLE}>
            <h3 className={styles.panelTitle}>{GRAPH_PAGE_NODES_TITLE}</h3>
            <div className={styles.panelBody}>
              <NodeList
                nodes={graph.nodes}
                selectedNodeId={graph.selectedNodeId}
                onSelect={graph.selectNode}
                onOpenFile={handleOpenFile}
              />
            </div>
            <div className={styles.pagination}>
              <button type="button" disabled={!graph.hasPrevPage} onClick={graph.goPrevPage}>
                Назад
              </button>
              <span>
                {graph.offset + 1}–{Math.min(graph.offset + graph.limit, graph.total)} из {graph.total}
              </span>
              <button type="button" disabled={!graph.hasNextPage} onClick={graph.goNextPage}>
                Далее
              </button>
            </div>
          </section>

          <section className={styles.panel} aria-label={GRAPH_PAGE_EDGES_TITLE}>
            <h3 className={styles.panelTitle}>{GRAPH_PAGE_EDGES_TITLE}</h3>
            <div className={styles.panelBody}>
              <EdgeTable
                edges={graph.edges}
                isLoading={graph.isLoadingEdges}
                selectedNodeId={graph.selectedNodeId}
              />
            </div>
          </section>
        </div>
      )}
      {toast ? (
        <div className={styles.graphToast} role="status">
          <span>{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Закрыть">
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
