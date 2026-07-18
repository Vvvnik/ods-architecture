import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { getGraphView } from '../api/graph.js';
import type { GraphViewNode, GraphViewSlice } from '../api/graph-types.js';
import { ApiError } from '../api/client.js';
import { GraphBreadcrumbs, type BreadcrumbItem } from '../components/graph-view/GraphBreadcrumbs.js';
import { GraphCanvas } from '../components/graph-view/GraphCanvas.js';
import { GraphInspector } from '../components/graph-view/GraphInspector.js';
import { GraphViewEmpty } from '../components/graph-view/GraphViewEmpty.js';
import { GraphEmptyState } from '../components/graph/GraphEmptyState.js';
import { useSession } from '../context/SessionContext.js';
import {
  GRAPH_VIEW_BREADCRUMB_SYSTEM,
  GRAPH_VIEW_EMPTY_NO_RELATED_CODE,
  GRAPH_VIEW_LOADING,
  GRAPH_VIEW_PAGE_TITLE,
  GRAPH_VIEW_RESOLVE_FALLBACK,
  GRAPH_VIEW_TRUNCATED,
} from '../i18n/ru.js';
import styles from '../styles/graph-view.module.css';
import type { GraphEmptyState as EmptyStateModel } from '../types/graph-empty.js';

interface GraphViewPageProps {
  routeProjectId?: string;
}

const SYSTEM_CRUMB: BreadcrumbItem = { id: null, label: GRAPH_VIEW_BREADCRUMB_SYSTEM };

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

export function GraphViewPage({ routeProjectId }: GraphViewPageProps = {}) {
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const { activeProjectId, setActiveProjectId } = useSession();
  const projectId = routeProjectId ?? paramProjectId ?? activeProjectId ?? undefined;
  const workspaceHref = projectId ? `/projects/${projectId}` : undefined;
  const [searchParams, setSearchParams] = useSearchParams();

  const focusParam = searchParams.get('focus');
  const resolveFrom = searchParams.get('resolve_from');
  const layerParam = (searchParams.get('layer') as 'system' | 'code' | null) ?? 'system';

  const [slice, setSlice] = useState<GraphViewSlice | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(projectId));
  const [emptyState, setEmptyState] = useState<EmptyStateModel | null>(
    projectId ? null : { reason: 'no_project' },
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([SYSTEM_CRUMB]);
  const lastFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (projectId && projectId !== activeProjectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, activeProjectId, setActiveProjectId]);

  useEffect(() => {
    if (!projectId) {
      setEmptyState({ reason: 'no_project' });
      setSlice(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setEmptyState(null);

    void getGraphView(projectId, {
      focus: focusParam ?? undefined,
      resolve_from: resolveFrom ?? undefined,
      layer: layerParam,
    })
      .then((data) => {
        if (cancelled) return;
        setSlice(data);

        if (data.empty_reason === 'no_graph') {
          setEmptyState({ reason: 'no_analysis' });
        } else {
          setEmptyState(null);
        }

        if (resolveFrom) {
          const next = new URLSearchParams();
          if (data.focus_id && data.resolve_status !== 'system_fallback') {
            next.set('focus', data.focus_id);
            if (data.layer === 'code' || data.resolve_status === 'exact_code') {
              next.set('layer', 'code');
            }
          }
          setSearchParams(next, { replace: true });
        }

        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'graph_not_found') {
          setEmptyState({ reason: 'no_analysis' });
        } else {
          setEmptyState({
            reason: 'error',
            message: error instanceof Error ? error.message : 'Не удалось загрузить схему',
          });
        }
        setSlice(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, focusParam, resolveFrom, layerParam, setSearchParams]);

  useEffect(() => {
    if (!slice) return;
    const focusId = slice.focus_id;
    if (focusId === lastFocusRef.current) return;
    const previous = lastFocusRef.current;
    lastFocusRef.current = focusId;

    if (!focusId) {
      setCrumbs([SYSTEM_CRUMB]);
      return;
    }

    const focusNode = slice.nodes.find((n) => n.id === focusId);
    const label = focusNode?.name ?? focusId;

    setCrumbs((prev) => {
      const existingIdx = prev.findIndex((c) => c.id === focusId);
      if (existingIdx >= 0) {
        return prev.slice(0, existingIdx + 1).map((c, i) =>
          i === existingIdx ? { id: focusId, label } : c,
        );
      }
      if (previous === null || prev.some((c) => c.id === previous)) {
        const base = prev.length ? prev : [SYSTEM_CRUMB];
        return [...base, { id: focusId, label }];
      }
      return [SYSTEM_CRUMB, { id: focusId, label }];
    });
  }, [slice]);

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
      setSearchParams(next, { replace: false });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    [setSearchParams, slice],
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
    if (!slice || !selectedNodeId) return null;
    return slice.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [slice, selectedNodeId]);

  if (!projectId) {
    return (
      <div className={styles.page}>
        <h2 className={styles.title}>{GRAPH_VIEW_PAGE_TITLE}</h2>
        <GraphEmptyState state={{ reason: 'no_project' }} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <h2 className={styles.title}>{GRAPH_VIEW_PAGE_TITLE}</h2>
        <div className={styles.loading}>{GRAPH_VIEW_LOADING}</div>
      </div>
    );
  }

  if (emptyState) {
    return (
      <div className={styles.page}>
        <h2 className={styles.title}>{GRAPH_VIEW_PAGE_TITLE}</h2>
        <GraphEmptyState state={emptyState} workspaceHref={workspaceHref} />
      </div>
    );
  }

  if (!slice) {
    return null;
  }

  if (slice.empty_reason === 'no_system_participants') {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h2 className={styles.title}>{GRAPH_VIEW_PAGE_TITLE}</h2>
        </div>
        <GraphViewEmpty projectId={projectId} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2 className={styles.title}>{GRAPH_VIEW_PAGE_TITLE}</h2>
          <GraphBreadcrumbs items={crumbs} onNavigate={navigateCrumb} />
        </div>
        {slice.truncated ? <div className={styles.banner}>{GRAPH_VIEW_TRUNCATED}</div> : null}
        {slice.empty_reason === 'no_related_code' ? (
          <div className={`${styles.banner} ${styles.bannerInfo}`}>
            {GRAPH_VIEW_EMPTY_NO_RELATED_CODE}
          </div>
        ) : null}
        {slice.resolve_status === 'system_fallback' ? (
          <div className={`${styles.banner} ${styles.bannerInfo}`}>{GRAPH_VIEW_RESOLVE_FALLBACK}</div>
        ) : null}
      </div>

      <div className={styles.layout}>
        <div className={styles.canvasPane}>
          <GraphCanvas
            viewNodes={slice.nodes}
            viewEdges={slice.edges}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            onSelectNode={setSelectedNodeId}
            onSelectEdge={setSelectedEdgeId}
            onEnterNode={(id) => setFocus(id)}
          />
        </div>
        <GraphInspector
          projectId={projectId}
          node={selectedNode}
          edges={slice.edges}
          layer={slice.layer ?? layerParam}
          onEnter={(id) => setFocus(id)}
          onEnterCode={enterCode}
        />
      </div>
    </div>
  );
}
