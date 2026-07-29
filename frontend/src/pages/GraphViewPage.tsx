import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';

import { getGraphUiOverview, getGraphView } from '../api/graph.js';
import type { GraphViewEdge, GraphViewNode, GraphViewSlice } from '../api/graph-types.js';
import { ApiError } from '../api/client.js';
import { GraphBreadcrumbs, type BreadcrumbItem } from '../components/graph-view/GraphBreadcrumbs.js';
import { GraphCanvas } from '../components/graph-view/GraphCanvas.js';
import { GraphInspector } from '../components/graph-view/GraphInspector.js';
import { GraphViewEmpty } from '../components/graph-view/GraphViewEmpty.js';
import { GraphEmptyState } from '../components/graph/GraphEmptyState.js';
import { useSession } from '../context/SessionContext.js';
import { useGraphInspectorWidth } from '../hooks/useGraphInspectorWidth.js';
import { useSync } from '../hooks/useSync.js';
import { useMessages } from '../i18n/locale.js';
import styles from '../styles/graph-view.module.css';
import type { GraphEmptyState as EmptyStateModel } from '../types/graph-empty.js';
import { startColumnResize } from '../utils/startColumnResize.js';
import {
  applyGraphViewSystemFilter,
  availableGraphViewSystemFilters,
  normalizeGraphViewSystemFilter,
  type GraphViewSystemFilter,
} from '../utils/graphViewSystemFilter.js';

interface GraphViewPageProps {
  routeProjectId?: string;
}

/** Keep last slice warm when leaving/returning to Graph view. */
const GRAPH_VIEW_STALE_MS = 5 * 60_000;
const GRAPH_VIEW_GC_MS = 15 * 60_000;
const GROUPED_MAX_NODES = 900;
const GROUPED_MAX_EDGES = 2500;
const ENDPOINT_GROUP_THRESHOLD = 300;
const ENDPOINT_GROUP_PREFIX = 'group:system:http_endpoint:';

const CODE_KINDS = new Set([
  'file',
  'module',
  'namespace',
  'class',
  'interface',
  'function',
  'method',
  'property',
  'field',
  'variable',
  'enum',
]);

function isCodeKind(kind: string | null | undefined): boolean {
  return Boolean(kind && CODE_KINDS.has(kind));
}

function compactGroupedSlice(slice: GraphViewSlice): GraphViewSlice {
  const endpointNodes = slice.nodes.filter((node) => node.kind === 'http_endpoint');
  if (endpointNodes.length < ENDPOINT_GROUP_THRESHOLD) {
    return slice;
  }

  const endpointIds = new Set(endpointNodes.map((node) => node.id));
  const keepEndpointIds = new Set<string>();
  for (const edge of slice.edges) {
    if (
      edge.type === 'http_calls' &&
      edge.metadata?.protocol === 'http' &&
      endpointIds.has(edge.to)
    ) {
      keepEndpointIds.add(edge.to);
    }
  }

  const groupById = new Map<
    string,
    { id: string; label: string; endpointIds: Set<string>; parentId?: string | null }
  >();
  for (const endpoint of endpointNodes) {
    const groupKey = endpoint.parent_id ?? 'external';
    const groupId = `${ENDPOINT_GROUP_PREFIX}${groupKey}`;
    const existing = groupById.get(groupId);
    if (existing) {
      existing.endpointIds.add(endpoint.id);
      continue;
    }
    const parentService =
      groupKey !== 'external'
        ? slice.nodes.find((node) => node.id === groupKey && node.kind === 'service')
        : null;
    const label =
      groupKey === 'external'
        ? 'HTTP endpoints (external)'
        : `HTTP endpoints (${parentService?.name ?? groupKey})`;
    groupById.set(groupId, {
      id: groupId,
      label,
      endpointIds: new Set([endpoint.id]),
      parentId: groupKey === 'external' ? null : groupKey,
    });
  }

  const groupNodeByEndpointId = new Map<string, string>();
  for (const group of groupById.values()) {
    for (const endpointId of group.endpointIds) {
      groupNodeByEndpointId.set(endpointId, group.id);
    }
  }

  const nodes: GraphViewNode[] = [];
  for (const node of slice.nodes) {
    if (node.kind !== 'http_endpoint' || keepEndpointIds.has(node.id)) {
      nodes.push(node);
    }
  }
  for (const group of groupById.values()) {
    nodes.push({
      id: group.id,
      project_id: slice.project_id,
      analysis_run_id: slice.analysis_run_id,
      parser_id: 'grouped-view',
      kind: 'http_endpoint_group',
      name: `${group.label} (${group.endpointIds.size})`,
      qualified_name: `${group.label} (${group.endpointIds.size})`,
      language: 'system',
      path: '',
      parent_id: group.parentId ?? undefined,
      metadata: { layer: 'system' },
      role: 'inside',
      stub: true,
    });
  }

  const seen = new Set<string>();
  const edges: GraphViewEdge[] = [];
  for (const edge of slice.edges) {
    let from = edge.from;
    let to = edge.to;
    if (endpointIds.has(edge.from) && !keepEndpointIds.has(edge.from)) {
      from = groupNodeByEndpointId.get(edge.from) ?? from;
    }
    if (endpointIds.has(edge.to) && !keepEndpointIds.has(edge.to)) {
      to = groupNodeByEndpointId.get(edge.to) ?? to;
    }
    const dedupeKey = `${from}->${to}:${edge.type}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    edges.push({
      ...edge,
      id: `grouped:${dedupeKey}`,
      from,
      to,
    });
  }

  return {
    ...slice,
    nodes,
    edges,
    counts: {
      ...slice.counts,
      nodes: nodes.length,
      edges: edges.length,
    },
  };
}

export function GraphViewPage({ routeProjectId }: GraphViewPageProps = {}) {
  const messages = useMessages();
  const {
    GRAPH_VIEW_BREADCRUMB_SYSTEM,
    GRAPH_VIEW_EMPTY_NO_RELATED_CODE,
    GRAPH_VIEW_LOADING,
    GRAPH_VIEW_LOAD_FALLBACK,
    GRAPH_VIEW_RESOLVE_FALLBACK,
    GRAPH_VIEW_SYSTEM_FILTER_ALL,
    GRAPH_VIEW_SYSTEM_FILTER_GRPC,
    GRAPH_VIEW_SYSTEM_FILTER_HTTP,
    GRAPH_VIEW_SYSTEM_FILTER_INFRA,
    GRAPH_VIEW_SYSTEM_FILTER_LABEL,
    GRAPH_VIEW_SYSTEM_FILTER_RPC_BUS,
    GRAPH_RESIZE_INSPECTOR,
  } = messages;
  const systemCrumb: BreadcrumbItem = { id: null, label: GRAPH_VIEW_BREADCRUMB_SYSTEM };
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const { activeProjectId, setActiveProjectId } = useSession();
  const projectId = routeProjectId ?? paramProjectId ?? activeProjectId ?? undefined;
  const { project } = useSync(projectId);
  const pageTitle = project?.name ?? messages.project;
  const workspaceHref = projectId ? `/projects/${projectId}` : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const { inspectorWidth, setInspectorWidth, min } = useGraphInspectorWidth();
  const layoutRef = useRef<HTMLDivElement>(null);

  const focusParam = searchParams.get('focus');
  const resolveFrom = searchParams.get('resolve_from');
  const layerParam = (searchParams.get('layer') as 'system' | 'code' | null) ?? 'system';
  const systemFilter = normalizeGraphViewSystemFilter(searchParams.get('system_filter'));

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([systemCrumb]);
  const lastFocusRef = useRef<string | null>(null);

  function startInspectorDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const containerWidth = layoutRef.current?.clientWidth;
    startColumnResize(event, {
      startWidth: inspectorWidth,
      direction: -1,
      onWidth: (next) => setInspectorWidth(next, containerWidth),
    });
  }

  useEffect(() => {
    setCrumbs((previous) =>
      previous.map((crumb) =>
        crumb.id === null ? { ...crumb, label: GRAPH_VIEW_BREADCRUMB_SYSTEM } : crumb,
      ),
    );
  }, [GRAPH_VIEW_BREADCRUMB_SYSTEM]);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, activeProjectId, setActiveProjectId]);

  const viewQuery = useQuery({
    queryKey: [
      'graphView',
      projectId,
      focusParam ?? null,
      layerParam,
      resolveFrom ?? null,
    ],
    queryFn: () =>
      getGraphView(projectId!, {
        focus: focusParam ?? undefined,
        resolve_from: resolveFrom ?? undefined,
        layer: layerParam,
        max_nodes: GROUPED_MAX_NODES,
        max_edges: GROUPED_MAX_EDGES,
      }),
    enabled: Boolean(projectId),
    staleTime: GRAPH_VIEW_STALE_MS,
    gcTime: GRAPH_VIEW_GC_MS,
    placeholderData: (previous) => previous,
  });

  const uiOverviewQuery = useQuery({
    queryKey: ['graphUiOverview', projectId],
    queryFn: () => getGraphUiOverview(projectId!),
    enabled: Boolean(projectId),
    staleTime: GRAPH_VIEW_STALE_MS,
    gcTime: GRAPH_VIEW_GC_MS,
  });

  const slice = viewQuery.data ?? null;
  const availableFilters = useMemo<GraphViewSystemFilter[]>(
    () => (slice ? availableGraphViewSystemFilters(slice) : ['all']),
    [slice],
  );
  const effectiveSystemFilter: GraphViewSystemFilter = availableFilters.includes(systemFilter)
    ? systemFilter
    : 'all';
  const displayedSlice = useMemo(() => {
    if (!slice) return null;
    const filtered = applyGraphViewSystemFilter(slice, effectiveSystemFilter);
    return compactGroupedSlice(filtered);
  }, [slice, effectiveSystemFilter]);
  const bindsServiceEdges = useMemo(
    () => (uiOverviewQuery.data?.edges ?? []).filter((edge) => edge.type === 'binds_service'),
    [uiOverviewQuery.data],
  );

  useEffect(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, [focusParam, layerParam, resolveFrom, effectiveSystemFilter]);

  useEffect(() => {
    if (!displayedSlice || !resolveFrom) {
      return;
    }
    const next = new URLSearchParams();
    if (displayedSlice.focus_id && displayedSlice.resolve_status !== 'system_fallback') {
      next.set('focus', displayedSlice.focus_id);
      if (displayedSlice.layer === 'code' || displayedSlice.resolve_status === 'exact_code') {
        next.set('layer', 'code');
      }
    }
    if (layerParam === 'system' && effectiveSystemFilter !== 'all') {
      next.set('system_filter', effectiveSystemFilter);
    }
    setSearchParams(next, { replace: true });
  }, [displayedSlice, layerParam, resolveFrom, setSearchParams, effectiveSystemFilter]);

  useEffect(() => {
    if (!displayedSlice) return;
    const focusId = displayedSlice.focus_id;
    if (focusId === lastFocusRef.current) return;
    const previous = lastFocusRef.current;
    lastFocusRef.current = focusId;

    if (!focusId) {
      setCrumbs([systemCrumb]);
      return;
    }

    const focusNode = displayedSlice.nodes.find((n) => n.id === focusId);
    const label = focusNode?.name ?? focusId;

    setCrumbs((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === focusId);
      if (existingIdx >= 0) {
        return prev.slice(0, existingIdx + 1).map((c, i) =>
          i === existingIdx ? { id: focusId, label } : c,
        );
      }
      if (previous === null || prev.some((c) => c.id === previous)) {
        const base = prev.length ? prev : [systemCrumb];
        return [...base, { id: focusId, label }];
      }
      return [systemCrumb, { id: focusId, label }];
    });
  }, [displayedSlice]);

  const setFocus = useCallback(
    (focusId: string | null, layer?: 'system' | 'code') => {
      const next = new URLSearchParams();
      if (focusId) {
        next.set('focus', focusId);
        const nextLayer =
          layer ??
          (isCodeKind(slice?.nodes.find((n) => n.id === focusId)?.kind) ? 'code' : 'system');
        if (nextLayer === 'code') {
          next.set('layer', 'code');
        }
      }
      if ((layer ?? layerParam) === 'system' && effectiveSystemFilter !== 'all') {
        next.set('system_filter', effectiveSystemFilter);
      }
      setSearchParams(next, { replace: false });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    [layerParam, setSearchParams, slice, effectiveSystemFilter],
  );

  const enterCode = useCallback(
    (serviceId: string) => {
      const next = new URLSearchParams();
      next.set('focus', serviceId);
      next.set('layer', 'code');
      setSearchParams(next, { replace: false });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    [setSearchParams],
  );

  const navigateCrumb = useCallback(
    (focusId: string | null) => {
      if (!focusId) {
        setFocus(null);
        return;
      }
      setFocus(focusId, isCodeKind(slice?.nodes.find((n) => n.id === focusId)?.kind) ? 'code' : 'system');
    },
    [setFocus, slice],
  );

  const selectedNode: GraphViewNode | null = useMemo(() => {
    if (!displayedSlice || !selectedNodeId) return null;
    return displayedSlice.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [displayedSlice, selectedNodeId]);

  const graphUiAppId = useMemo(() => {
    if (!selectedNode || selectedNode.kind !== 'service') return null;
    const direct = bindsServiceEdges.find((entry) => entry.to === selectedNode.id);
    if (direct) return direct.from;
    const name = selectedNode.name.trim().toLowerCase();
    if (!name) return null;
    const fuzzy = bindsServiceEdges.find((entry) => entry.to.toLowerCase().endsWith(`#${name}`));
    return fuzzy?.from ?? null;
  }, [bindsServiceEdges, selectedNode]);

  const viewportKey = useMemo(
    () => `graph-view:v3:${projectId ?? ''}:${focusParam ?? 'root'}:${layerParam}:grouped`,
    [focusParam, layerParam, projectId],
  );

  const emptyState: EmptyStateModel | null = useMemo(() => {
    if (!projectId) {
      return { reason: 'no_project' };
    }
    if (viewQuery.isError) {
      const error = viewQuery.error;
      if (error instanceof ApiError && error.code === 'graph_not_found') {
        return { reason: 'no_analysis' };
      }
      return {
        reason: 'error',
        message: error instanceof Error ? error.message : GRAPH_VIEW_LOAD_FALLBACK,
      };
    }
    if (slice?.empty_reason === 'no_graph') {
      return { reason: 'no_analysis' };
    }
    return null;
  }, [GRAPH_VIEW_LOAD_FALLBACK, projectId, slice?.empty_reason, viewQuery.error, viewQuery.isError]);

  // Full-page loader only when nothing cached yet.
  const showInitialLoading = Boolean(projectId) && viewQuery.isPending && !slice;

  if (!projectId) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        <div className="page-chrome-header">
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
        </div>
        <div className="page-chrome-body">
          <GraphEmptyState state={{ reason: 'no_project' }} />
        </div>
      </div>
    );
  }

  if (showInitialLoading) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        <div className="page-chrome-header">
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
        </div>
        <div className={`page-chrome-body ${styles.loading}`}>{GRAPH_VIEW_LOADING}</div>
      </div>
    );
  }

  if (emptyState) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        <div className="page-chrome-header">
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
        </div>
        <div className="page-chrome-body">
          <GraphEmptyState state={emptyState} workspaceHref={workspaceHref} />
        </div>
      </div>
    );
  }

  if (!displayedSlice) {
    return null;
  }

  if (displayedSlice.empty_reason === 'no_system_participants') {
    return (
      <div className={`page-chrome ${styles.page}`}>
        <div className={`page-chrome-header ${styles.header}`}>
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
        </div>
        <div className="page-chrome-body">
          <GraphViewEmpty projectId={projectId} />
        </div>
      </div>
    );
  }

  const filterLabelByValue: Record<GraphViewSystemFilter, string> = {
    all: GRAPH_VIEW_SYSTEM_FILTER_ALL,
    http: GRAPH_VIEW_SYSTEM_FILTER_HTTP,
    grpc: GRAPH_VIEW_SYSTEM_FILTER_GRPC,
    rpc_bus: GRAPH_VIEW_SYSTEM_FILTER_RPC_BUS,
    infra: GRAPH_VIEW_SYSTEM_FILTER_INFRA,
  };
  const filterOptions: Array<{ value: GraphViewSystemFilter; label: string }> = availableFilters.map(
    (value) => ({ value, label: filterLabelByValue[value] }),
  );

  const setSystemFilter = (value: GraphViewSystemFilter) => {
    const next = new URLSearchParams(searchParams);
    if (value === 'all') {
      next.delete('system_filter');
    } else {
      next.set('system_filter', value);
    }
    setSearchParams(next, { replace: false });
  };

  return (
    <div className={`page-chrome ${styles.page}`}>
      <div className={`page-chrome-header ${styles.header}`}>
        <div className={`page-chrome-title-row ${styles.titleRow}`}>
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
          <GraphBreadcrumbs items={crumbs} onNavigate={navigateCrumb} />
        </div>
        {layerParam === 'system' ? (
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>{GRAPH_VIEW_SYSTEM_FILTER_LABEL}</span>
            <div className={styles.filterButtons}>
              {filterOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={
                    option.value === effectiveSystemFilter
                      ? `${styles.filterButton} ${styles.filterButtonActive}`
                      : styles.filterButton
                  }
                  onClick={() => setSystemFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {displayedSlice.empty_reason === 'no_related_code' ? (
          <div className={`${styles.banner} ${styles.bannerInfo}`}>
            {GRAPH_VIEW_EMPTY_NO_RELATED_CODE}
          </div>
        ) : null}
        {displayedSlice.resolve_status === 'system_fallback' ? (
          <div className={`${styles.banner} ${styles.bannerInfo}`}>{GRAPH_VIEW_RESOLVE_FALLBACK}</div>
        ) : null}
      </div>

      <div className="page-chrome-body">
        <div className={styles.layout} ref={layoutRef}>
          <div className={styles.canvasPane}>
            <GraphCanvas
              viewNodes={displayedSlice.nodes}
              viewEdges={displayedSlice.edges}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onSelectNode={setSelectedNodeId}
              onSelectEdge={setSelectedEdgeId}
              onEnterNode={(id) => setFocus(id)}
              viewportKey={viewportKey}
              layoutMode="grouped"
            />
          </div>
          <div
            className={styles.splitter}
            role="separator"
            aria-orientation="vertical"
            aria-valuenow={inspectorWidth}
            aria-label={GRAPH_RESIZE_INSPECTOR}
            onPointerDown={startInspectorDrag}
          />
          <div
            className={styles.inspectorPane}
            style={{ width: inspectorWidth, minWidth: min.inspector }}
          >
            <GraphInspector
              projectId={projectId}
              node={selectedNode}
              edges={displayedSlice.edges}
              nodes={displayedSlice.nodes}
              layer={displayedSlice.layer ?? layerParam}
              onEnter={(id) => setFocus(id)}
              onEnterCode={enterCode}
              graphUiAppId={graphUiAppId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
