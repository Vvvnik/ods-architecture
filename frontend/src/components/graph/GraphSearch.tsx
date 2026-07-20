import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { searchGraph } from '../../api/graph.js';
import type { GraphEdge, GraphNode, GraphSearchResult } from '../../api/graph-types.js';
import { useGraphSearchResultsHeight } from '../../hooks/useGraphSearchResultsHeight.js';
import { graphEdgeTypeLabel } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';
import styles from '../../styles/graph.module.css';
import { startRowResize } from '../../utils/startColumnResize.js';
import {
  filterEdgesByLayer,
  filterNodesByLayer,
  buildNodeIndex,
  type GraphLayerFilter,
} from '../../utils/graphLayerFilter.js';
import { shortGraphRefLabel, displayGraphNodeLabel } from '../../utils/graphNodeLabel.js';

interface GraphSearchProps {
  projectId: string;
  analysisRunId: string;
  layerFilter?: GraphLayerFilter;
  onSelectNode: (node: GraphNode) => void;
  onSelectEdge: (edge: GraphEdge) => void;
}

const PAGE = 50;

export function GraphSearch({
  projectId,
  analysisRunId,
  layerFilter = 'all',
  onSelectNode,
  onSelectEdge,
}: GraphSearchProps) {
  const messages = useMessages();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'nodes' | 'edges'>('nodes');
  const [result, setResult] = useState<GraphSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodesOffset, setNodesOffset] = useState(0);
  const [edgesOffset, setEdgesOffset] = useState(0);
  const requestIdRef = useRef(0);
  const { height, setListHeight, min } = useGraphSearchResultsHeight();

  async function fetchPage(offset: number, replace: boolean) {
    setError(null);
    if (q.trim().length < 2) {
      setError(messages.SEARCH_MIN_CHARS);
      return;
    }
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const data = await searchGraph(projectId, {
        q: q.trim(),
        analysis_run_id: analysisRunId,
        limit: PAGE,
        offset,
      });
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (replace) {
        setResult(data);
        setNodesOffset(data.nodes.offset ?? offset);
        setEdgesOffset(data.edges.offset ?? offset);
        setTab('nodes');
      } else if (tab === 'nodes') {
        setResult((prev) =>
          prev
            ? {
                ...data,
                nodes: {
                  ...data.nodes,
                  items: data.nodes.items,
                },
                edges: prev.edges,
              }
            : data,
        );
        setNodesOffset(data.nodes.offset ?? offset);
      } else {
        setResult((prev) =>
          prev
            ? {
                ...data,
                edges: {
                  ...data.edges,
                  items: data.edges.items,
                },
                nodes: prev.nodes,
              }
            : data,
        );
        setEdgesOffset(data.edges.offset ?? offset);
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setError(err instanceof Error ? err.message : messages.SEARCH_ERROR);
      if (replace) setResult(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }

  async function runSearch() {
    await fetchPage(0, true);
  }

  function startHeightDrag(event: ReactPointerEvent<HTMLDivElement>) {
    startRowResize(event, {
      startHeight: height,
      onHeight: setListHeight,
    });
  }

  const activeOffset = tab === 'nodes' ? nodesOffset : edgesOffset;
  const layerFilterActive = layerFilter !== 'all';
  const filteredNodes = result ? filterNodesByLayer(result.nodes.items, layerFilter) : [];
  const filteredEdges = result
    ? filterEdgesByLayer(result.edges.items, buildNodeIndex(result.nodes.items), layerFilter)
    : [];
  const activeItems = tab === 'nodes' ? filteredNodes : filteredEdges;
  const activeTotal = layerFilterActive
    ? activeItems.length
    : tab === 'nodes'
      ? (result?.nodes.total ?? 0)
      : (result?.edges.total ?? 0);
  const activeCount = activeItems.length;
  const hasPrev = !layerFilterActive && activeOffset > 0;
  const hasNext =
    !layerFilterActive &&
    activeOffset + (tab === 'nodes' ? (result?.nodes.items.length ?? 0) : (result?.edges.items.length ?? 0)) <
      activeTotal;

  return (
    <div className={styles.search}>
      <div className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={q}
          placeholder={messages.SEARCH_PLACEHOLDER}
          onChange={(event) => setQ(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              void runSearch();
            }
          }}
        />
        <button type="button" className={styles.searchButton} disabled={loading} onClick={() => void runSearch()}>
          {messages.SEARCH_ACTION}
        </button>
      </div>
      {error ? <div className={styles.searchError}>{error}</div> : null}
      {result ? (
        <div className={styles.searchResults}>
          <div className={styles.searchTabs}>
            <button
              type="button"
              className={tab === 'nodes' ? styles.searchTabActive : styles.searchTab}
              onClick={() => setTab('nodes')}
            >
              {messages.SEARCH_NODES} ({layerFilterActive ? filteredNodes.length : result.nodes.total})
            </button>
            <button
              type="button"
              className={tab === 'edges' ? styles.searchTabActive : styles.searchTab}
              onClick={() => setTab('edges')}
            >
              {messages.SEARCH_EDGES} ({layerFilterActive ? filteredEdges.length : (result.edges.total ?? result.edges.items.length)})
            </button>
          </div>
          {tab === 'nodes' ? (
            <ul className={styles.searchList} style={{ height, minHeight: min }}>
              {filteredNodes.map((node) => (
                <li key={node.id}>
                  <button type="button" onClick={() => onSelectNode(node)}>
                    <strong>{displayGraphNodeLabel(node, node.id)}</strong>
                    <span>
                      {node.kind} · {node.path}
                    </span>
                  </button>
                </li>
              ))}
              {filteredNodes.length === 0 ? <li className={styles.searchEmpty}>{messages.SEARCH_NO_MATCHES}</li> : null}
            </ul>
          ) : (
            <ul className={styles.searchList} style={{ height, minHeight: min }}>
              {filteredEdges.map((edge) => (
                <li key={edge.id}>
                  <button type="button" onClick={() => onSelectEdge(edge)}>
                    <strong>{graphEdgeTypeLabel(edge.type)}</strong>
                    <span title={`${edge.from} → ${edge.to}`}>
                      {shortGraphRefLabel(edge.from)} → {shortGraphRefLabel(edge.to)}
                    </span>
                  </button>
                </li>
              ))}
              {filteredEdges.length === 0 ? <li className={styles.searchEmpty}>{messages.SEARCH_NO_MATCHES}</li> : null}
            </ul>
          )}
          <div
            className={styles.searchHeightSplitter}
            role="separator"
            aria-orientation="horizontal"
            aria-valuenow={height}
            aria-label={messages.SEARCH_RESIZE}
            onPointerDown={startHeightDrag}
          />
          {layerFilterActive ? (
            <div className={styles.searchEmpty}>{messages.SEARCH_PAGINATION_DISABLED}</div>
          ) : null}
          {!layerFilterActive && activeTotal > PAGE ? (
            <div className={`${styles.pagination} ${styles.searchPagination}`}>
              <button
                type="button"
                disabled={!hasPrev || loading}
                onClick={() => void fetchPage(Math.max(0, activeOffset - PAGE), false)}
              >
                {messages.PREVIOUS}
              </button>
              <span>
                {activeOffset + 1}–{activeOffset + activeCount} / {activeTotal}
              </span>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => void fetchPage(activeOffset + PAGE, false)}
              >
                {messages.NEXT}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
