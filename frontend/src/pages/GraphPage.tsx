import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { getGraphNodeAncestors, getGraphSummary, getNodeEdges } from '../api/graph.js';
import type { GraphEdge, GraphNode, GraphSummary } from '../api/graph-types.js';
import { ApiError } from '../api/client.js';
import { GraphBreadcrumbs } from '../components/graph-view/GraphBreadcrumbs.js';
import { EdgeTable } from '../components/graph/EdgeTable.js';
import { GraphEmptyState } from '../components/graph/GraphEmptyState.js';
import { GraphNodeTree } from '../components/graph/GraphNodeTree.js';
import { GraphSearch } from '../components/graph/GraphSearch.js';
import { useAnalysisFlow } from '../context/AnalysisProvider.js';
import { useSession } from '../context/SessionContext.js';
import { useGraphPanelWidths } from '../hooks/useGraphPanelWidths.js';
import { useSync } from '../hooks/useSync.js';
import { formatAnalysisProgressHint, formatSyncProgressHint } from '../i18n/index.js';
import { useMessages } from '../i18n/locale.js';
import styles from '../styles/graph.module.css';
import type { GraphEmptyState as EmptyStateModel } from '../types/graph-empty.js';
import { startColumnResize } from '../utils/startColumnResize.js';
import {
  filterEdgesByLayer,
  readGraphLayerFilter,
  writeGraphLayerFilter,
  type GraphLayerFilter,
  buildNodeIndex,
} from '../utils/graphLayerFilter.js';
import { displayGraphNodeLabel, shortGraphRefLabel } from '../utils/graphNodeLabel.js';

interface GraphPageProps {
  /** projectId from /projects/:projectId/graph takes precedence over the session. */
  routeProjectId?: string;
}

export function GraphPage({ routeProjectId }: GraphPageProps = {}) {
  const messages = useMessages();
  const {
    GRAPH_LAYER_FILTER_LABELS,
    GRAPH_LAYER_FILTER_PREFIX,
    GRAPH_PAGE_EDGES_TITLE,
    GRAPH_PAGE_NODES_TITLE,
    GRAPH_ANALYSIS_HINT,
    GRAPH_EDGE_COUNT,
    GRAPH_LOADING,
    GRAPH_LOAD_FALLBACK,
    GRAPH_NODE_COUNT,
    GRAPH_RESIZE_NODES,
    GRAPH_SNAPSHOT,
    GRAPH_SYNC_HINT,
    GRAPH_VIEW_BREADCRUMB_SYSTEM,
    GRAPH_VIEW_OPEN_VIEW,
  } = messages;
  const { activeProjectId, setActiveProjectId } = useSession();
  const projectId = routeProjectId ?? activeProjectId;
  const workspaceHref = projectId ? `/projects/${projectId}` : undefined;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectParam = searchParams.get('select');
  const { widths, setNodesWidth, min } = useGraphPanelWidths();
  const layoutRef = useRef<HTMLDivElement>(null);
  const { project, isRunning } = useSync(projectId ?? undefined);
  const analysis = useAnalysisFlow();
  const wasAnalysisRunningRef = useRef(false);
  const appliedSelectRef = useRef<string | null>(null);

  const [summary, setSummary] = useState<GraphSummary | null>(null);
  const [emptyState, setEmptyState] = useState<EmptyStateModel | null>(
    projectId ? null : { reason: 'no_project' },
  );
  const [isLoading, setIsLoading] = useState(() => Boolean(projectId));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isLoadingEdges, setIsLoadingEdges] = useState(false);
  const [expandPathIds, setExpandPathIds] = useState<string[]>([]);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [layerFilter, setLayerFilter] = useState<GraphLayerFilter>(() => readGraphLayerFilter());
  const [knownNodes, setKnownNodes] = useState<GraphNode[]>([]);

  useEffect(() => {
    if (routeProjectId && routeProjectId !== activeProjectId) {
      setActiveProjectId(routeProjectId);
    }
  }, [routeProjectId, activeProjectId, setActiveProjectId]);

  useEffect(() => {
    if (!projectId) {
      setEmptyState({ reason: 'no_project' });
      setSummary(null);
      setIsLoading(false);
      setSelectedNodeId(null);
      setEdges([]);
      setExpandPathIds([]);
      setFocusNodeId(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setSummary(null);
    setEmptyState(null);
    setSelectedNodeId(null);
    setEdges([]);
    setExpandPathIds([]);
    setFocusNodeId(null);

    void getGraphSummary(projectId)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        if (data.node_count === 0) {
          setEmptyState(
            data.ingest_status === 'partial'
              ? { reason: 'ingest_failed' }
              : { reason: 'empty_graph' },
          );
        } else {
          setEmptyState(null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'graph_not_found') {
          setEmptyState({ reason: 'no_analysis' });
        } else {
          setEmptyState({
            reason: 'error',
            message: error instanceof Error ? error.message : GRAPH_LOAD_FALLBACK,
          });
        }
        setSummary(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [GRAPH_LOAD_FALLBACK, projectId]);

  // Refresh the summary and tree after parsers finish, not when modals open or close.
  useEffect(() => {
    const running = analysis.isParserRunActive;
    if (wasAnalysisRunningRef.current && !running && projectId) {
      setIsLoading(true);
      void getGraphSummary(projectId)
        .then((data) => {
          setSummary(data);
          setEmptyState(
            data.node_count === 0
              ? data.ingest_status === 'partial'
                ? { reason: 'ingest_failed' }
                : { reason: 'empty_graph' }
              : null,
          );
          setSelectedNodeId(null);
          setEdges([]);
          setExpandPathIds([]);
          setFocusNodeId(null);
        })
        .catch(() => {
          /* leave current summary */
        })
        .finally(() => setIsLoading(false));
    }
    wasAnalysisRunningRef.current = running;
  }, [analysis.isParserRunActive, projectId]);

  const loadEdges = useCallback(
    async (nodeId: string, analysisRunId: string) => {
      if (!projectId) return;
      setIsLoadingEdges(true);
      try {
        const edgePage = await getNodeEdges(projectId, nodeId, {
          analysis_run_id: analysisRunId,
          direction: 'both',
          limit: 50,
        });
        setEdges(edgePage.items);
      } catch {
        setEdges([]);
      } finally {
        setIsLoadingEdges(false);
      }
    },
    [projectId],
  );

  const selectNode = useCallback(
    async (node: GraphNode, options?: { expandAncestors?: boolean }) => {
      setKnownNodes((prev) => (prev.some((item) => item.id === node.id) ? prev : [...prev, node]));
      setSelectedNodeId(node.id);
      setFocusNodeId(node.id);
      if (!projectId || !summary) return;

      if (options?.expandAncestors) {
        try {
          const path = await getGraphNodeAncestors(
            projectId,
            node.id,
            summary.analysis_run_id,
          );
          setExpandPathIds([...path.ancestors.map((item) => item.id), node.id]);
        } catch {
          setExpandPathIds([node.id]);
        }
      }

      await loadEdges(node.id, summary.analysis_run_id);
    },
    [projectId, summary, loadEdges],
  );

  useEffect(() => {
    if (!projectId || !summary || !selectParam) return;
    if (appliedSelectRef.current === selectParam) return;
    appliedSelectRef.current = selectParam;

    let cancelled = false;
    void (async () => {
      try {
        const path = await getGraphNodeAncestors(
          projectId,
          selectParam,
          summary.analysis_run_id,
        );
        if (cancelled) return;
        const leaf: GraphNode = {
          id: selectParam,
          project_id: projectId,
          analysis_run_id: summary.analysis_run_id,
          parser_id: '',
          kind: 'unknown',
          name: shortGraphRefLabel(selectParam),
          language: '',
          path: '',
        };
        setExpandPathIds([...path.ancestors.map((item) => item.id), selectParam]);
        setKnownNodes((prev) => {
          const next = [...prev];
          for (const ancestor of path.ancestors) {
            if (!next.some((n) => n.id === ancestor.id)) next.push(ancestor);
          }
          if (!next.some((n) => n.id === leaf.id)) next.push(leaf);
          return next;
        });
        setSelectedNodeId(selectParam);
        setFocusNodeId(selectParam);
        await loadEdges(selectParam, summary.analysis_run_id);
        const next = new URLSearchParams(searchParams);
        next.delete('select');
        setSearchParams(next, { replace: true });
      } catch {
        appliedSelectRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, summary, selectParam, loadEdges, searchParams, setSearchParams]);

  const handleSelectEdge = useCallback(
    async (edge: GraphEdge) => {
      if (!projectId || !summary) return;
      try {
        const path = await getGraphNodeAncestors(
          projectId,
          edge.from,
          summary.analysis_run_id,
        );
        setExpandPathIds([...path.ancestors.map((item) => item.id), edge.from]);
        setSelectedNodeId(edge.from);
        setFocusNodeId(edge.from);
        await loadEdges(edge.from, summary.analysis_run_id);
      } catch {
        setSelectedNodeId(edge.from);
        setEdges([edge]);
      }
    },
    [projectId, summary, loadEdges],
  );

  function startNodesDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const containerWidth = layoutRef.current?.clientWidth;
    startColumnResize(event, {
      startWidth: widths.nodes,
      onWidth: (next) => setNodesWidth(next, containerWidth),
    });
  }

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ id: string | null; label: string }> = [
      { id: null, label: GRAPH_VIEW_BREADCRUMB_SYSTEM },
    ];
    if (selectedNodeId) {
      const selected = knownNodes.find((n) => n.id === selectedNodeId);
      items.push({
        id: selectedNodeId,
        label: displayGraphNodeLabel(selected, selectedNodeId),
      });
    }
    return items;
  }, [GRAPH_VIEW_BREADCRUMB_SYSTEM, knownNodes, selectedNodeId]);

  function navigateBreadcrumb(focusId: string | null) {
    if (!projectId) {
      return;
    }
    if (focusId === null) {
      navigate(`/projects/${projectId}/graph-view`);
      return;
    }
    navigate(`/projects/${projectId}/graph-view?focus=${encodeURIComponent(focusId)}`);
  }

  function renderTitleBar() {
    return (
      <div className={`page-chrome-header page-chrome-header--split ${styles.header}`}>
        <div className={`page-chrome-title-row ${styles.titleRow}`}>
          <h2 className={`page-chrome-title ${styles.title}`}>{project?.name ?? messages.project}</h2>
          {isRunning ? (
            <span className={`page-chrome-hint ${styles.processHint}`}>
              {project ? formatSyncProgressHint(project) : GRAPH_SYNC_HINT}
            </span>
          ) : null}
          {analysis.isParserRunActive && !isRunning ? (
            <span className={`page-chrome-hint ${styles.processHint}`}>
              {analysis.activeRun
                ? formatAnalysisProgressHint(analysis.activeRun)
                : GRAPH_ANALYSIS_HINT}
            </span>
          ) : null}
        </div>
        {summary ? (
          <div className={`page-chrome-meta ${styles.meta}`}>
            {GRAPH_SNAPSHOT}: {summary.analysis_run_id.slice(0, 8)}… · {GRAPH_NODE_COUNT}: {summary.node_count} · {GRAPH_EDGE_COUNT}:{' '}
            {summary.edge_count}
            {summary.languages?.length ? ` · ${summary.languages.join(', ')}` : ''}
            <label className={styles.layerFilter} style={{ marginLeft: '1rem' }}>
              {GRAPH_LAYER_FILTER_PREFIX}{' '}
              <select
                name="layer"
                value={layerFilter}
                onChange={(event) => {
                  const next = event.target.value as GraphLayerFilter;
                  setLayerFilter(next);
                  writeGraphLayerFilter(next);
                  setSelectedNodeId(null);
                  setEdges([]);
                }}
              >
                {(Object.keys(GRAPH_LAYER_FILTER_LABELS) as GraphLayerFilter[]).map((key) => (
                  <option key={key} value={key}>
                    {GRAPH_LAYER_FILTER_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        {renderTitleBar()}
        <div className={`page-chrome-body ${styles.loading}`}>{GRAPH_LOADING}</div>
      </div>
    );
  }

  if (emptyState) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        {renderTitleBar()}
        <div className="page-chrome-body">
          <GraphEmptyState state={emptyState} workspaceHref={workspaceHref} />
        </div>
      </div>
    );
  }

  const nodeIndex = buildNodeIndex(knownNodes);
  const visibleEdges =
    layerFilter === 'all' ? edges : filterEdgesByLayer(edges, nodeIndex, layerFilter);

  return (
    <div className={`page-chrome ${styles.page}`}>
      {renderTitleBar()}
      <div className="page-chrome-body">
      {projectId ? (
        <GraphBreadcrumbs items={breadcrumbItems} onNavigate={navigateBreadcrumb} />
      ) : null}

      {summary && projectId ? (
        <div className={styles.searchBar}>
          <GraphSearch
            projectId={projectId}
            analysisRunId={summary.analysis_run_id}
            layerFilter={layerFilter}
            onSelectNode={(node) => {
              void selectNode(node, { expandAncestors: true });
            }}
            onSelectEdge={(edge) => {
              void handleSelectEdge(edge);
            }}
          />
          {selectedNodeId ? (
            <Link
              id="open-code-graph"
              className={styles.searchBarLink}
              to={`/projects/${projectId}/graph-view?resolve_from=${encodeURIComponent(selectedNodeId)}`}
            >
              {GRAPH_VIEW_OPEN_VIEW}
            </Link>
          ) : null}
        </div>
      ) : null}

      {summary && projectId ? (
        <div className={styles.layout} ref={layoutRef}>
          <section
            className={styles.panel}
            aria-label={GRAPH_PAGE_NODES_TITLE}
            style={{ width: widths.nodes, minWidth: min.nodes, flex: '0 0 auto' }}
          >
            <h3 className={styles.panelTitle}>{GRAPH_PAGE_NODES_TITLE}</h3>
            <div className={styles.panelBody}>
              <GraphNodeTree
                key={`${projectId}:${summary.analysis_run_id}:${layerFilter}`}
                projectId={projectId}
                analysisRunId={summary.analysis_run_id}
                layerFilter={layerFilter}
                selectedNodeId={selectedNodeId}
                onSelect={(node) => {
                  void selectNode(node);
                }}
                expandPathIds={expandPathIds}
                focusNodeId={focusNodeId}
              />
            </div>
          </section>

          <div
            className={`workspace-splitter ${styles.splitter}`}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={widths.nodes}
            aria-label={GRAPH_RESIZE_NODES}
            onPointerDown={startNodesDrag}
          />

          <section
            className={styles.panel}
            aria-label={GRAPH_PAGE_EDGES_TITLE}
            style={{ minWidth: min.edges, flex: '1 1 auto' }}
          >
            <h3 className={styles.panelTitle}>{GRAPH_PAGE_EDGES_TITLE}</h3>
            <div className={`${styles.panelBody} ${styles.panelBodyScrollable}`}>
              <EdgeTable
                edges={visibleEdges}
                isLoading={isLoadingEdges}
                selectedNodeId={selectedNodeId}
              />
            </div>
          </section>
        </div>
      ) : null}
      </div>
    </div>
  );
}
