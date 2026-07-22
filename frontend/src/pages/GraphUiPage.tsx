import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

import { getGraphUiOverview, getGraphUiScreen } from '../api/graph.js';
import type { GraphUiEdge, GraphUiNode, GraphUiSlice } from '../api/graph-types.js';
import { ApiError } from '../api/client.js';
import { GraphUiInspector } from '../components/graph-ui/GraphUiInspector.js';
import {
  GraphUiViewport,
  type GraphUiFrameCard,
} from '../components/graph-ui/GraphUiViewport.js';
import { GraphEmptyState } from '../components/graph/GraphEmptyState.js';
import { useSession } from '../context/SessionContext.js';
import { useSync } from '../hooks/useSync.js';
import { useMessages } from '../i18n/locale.js';
import type { Messages } from '../i18n/ru.js';
import styles from '../styles/graph-ui.module.css';
import type { GraphEmptyState as EmptyStateModel } from '../types/graph-empty.js';

interface GraphUiPageProps {
  routeProjectId?: string;
}

const DRILL_KINDS = new Set([
  'ui_frame',
  'ui_component',
  'ui_control',
  'ui_surface',
  'ui_style',
  'ui_flow',
]);

function kindLabel(kind: string, messages: Messages): string {
  switch (kind) {
    case 'ui_screen':
      return messages.GRAPH_UI_KIND_SCREEN;
    case 'ui_route':
      return messages.GRAPH_UI_KIND_ROUTE;
    case 'ui_flow':
      return messages.GRAPH_UI_KIND_FLOW;
    case 'ui_modal':
      return messages.GRAPH_UI_KIND_MODAL;
    case 'ui_frame':
      return messages.GRAPH_UI_KIND_FRAME;
    case 'ui_component':
      return messages.GRAPH_UI_KIND_COMPONENT;
    case 'ui_control':
      return messages.GRAPH_UI_KIND_CONTROL;
    case 'ui_surface':
      return messages.GRAPH_UI_KIND_SURFACE;
    case 'ui_style':
      return messages.GRAPH_UI_KIND_STYLE;
    default:
      return messages.GRAPH_UI_KIND_OTHER;
  }
}

function humanizeModalStep(step: string): string {
  return step
    .replace(/Modal$/i, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
}

function routePathForScreen(
  screen: GraphUiNode,
  nodes: GraphUiNode[],
  edges: GraphUiEdge[],
): string | undefined {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const edge of edges) {
    if (edge.type !== 'contains' || edge.to !== screen.id) continue;
    const parent = byId.get(edge.from);
    if (parent?.kind === 'ui_route') {
      return parent.signature || parent.qualified_name || parent.name;
    }
  }
  return screen.signature || screen.qualified_name || undefined;
}

function descendantIds(rootId: string, nodes: GraphUiNode[]): Set<string> {
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.parent_id) continue;
    const list = children.get(node.parent_id) ?? [];
    list.push(node.id);
    children.set(node.parent_id, list);
  }
  const ids = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of children.get(current) ?? []) {
      if (ids.has(child)) continue;
      ids.add(child);
      queue.push(child);
    }
  }
  return ids;
}

function isLayoutNoise(node: GraphUiNode): boolean {
  const meta = node.metadata ?? {};
  return meta.hint === true || meta.api_hint === true || meta.synthetic_field === true;
}

/** Overview: screens + each analysis modal as its own card (both visible). */
function buildOverviewFrames(
  nodes: GraphUiNode[],
  edges: GraphUiEdge[],
  messages: Messages,
): GraphUiFrameCard[] {
  const screens = nodes.filter((node) => node.kind === 'ui_screen');
  const flows = nodes.filter((node) => node.kind === 'ui_flow');
  const frames: GraphUiFrameCard[] = [];

  if (screens.length > 0) {
    for (const screen of screens) {
      const route = routePathForScreen(screen, nodes, edges);
      frames.push({
        id: screen.id,
        kind: screen.kind,
        kindLabel: kindLabel(screen.kind, messages),
        title: screen.name,
        subtitle: route,
        path: screen.path,
        canEnter: true,
      });
    }
  } else {
    for (const route of nodes.filter((node) => node.kind === 'ui_route')) {
      frames.push({
        id: route.id,
        kind: route.kind,
        kindLabel: kindLabel(route.kind, messages),
        title: route.signature || route.name,
        path: route.path,
        canEnter: true,
      });
    }
  }

  for (const flow of flows) {
    const steps = Array.isArray(flow.metadata?.steps)
      ? (flow.metadata.steps as unknown[]).filter((step): step is string => typeof step === 'string')
      : [];
    const modalSteps = steps.filter(
      (step) => /modal/i.test(step) || /Confirm/i.test(step),
    );
    if (modalSteps.length > 0) {
      for (const step of modalSteps) {
        frames.push({
          id: `${flow.id}::${step}`,
          selectNodeId: flow.id,
          kind: 'ui_modal',
          kindLabel: kindLabel('ui_modal', messages),
          title: humanizeModalStep(step),
          subtitle: flow.name,
          path: flow.path,
          canEnter: false,
          emphasis: 'flow',
        });
      }
    } else {
      frames.push({
        id: flow.id,
        kind: flow.kind,
        kindLabel: kindLabel(flow.kind, messages),
        title: flow.name,
        subtitle:
          steps.length > 0 ? steps.join(' → ') : messages.GRAPH_UI_FLOW_OVERLAY_HINT,
        path: flow.path,
        canEnter: false,
        emphasis: 'flow',
      });
    }
  }

  return frames;
}

/** Drill: only structural descendants of the focused screen (no API hints / app styles). */
function buildDrillFrames(
  nodes: GraphUiNode[],
  focusId: string | null | undefined,
  messages: Messages,
): GraphUiFrameCard[] {
  if (!focusId) return [];
  const scope = descendantIds(focusId, nodes);
  const structural = nodes.filter(
    (node) =>
      scope.has(node.id) &&
      node.id !== focusId &&
      DRILL_KINDS.has(node.kind) &&
      node.kind !== 'ui_flow' &&
      !isLayoutNoise(node),
  );

  return structural.map((node) => ({
    id: node.id,
    kind: node.kind,
    kindLabel: kindLabel(node.kind, messages),
    title: node.name,
    subtitle: node.signature || undefined,
    path: node.path,
    canEnter: false,
  }));
}

function canDrillKind(kind: string): boolean {
  return kind === 'ui_route' || kind === 'ui_screen';
}

export function GraphUiPage({ routeProjectId }: GraphUiPageProps = {}) {
  const messages = useMessages();
  const {
    GRAPH_UI_EMPTY,
    GRAPH_UI_EMPTY_NO_SCREENS,
    GRAPH_UI_LOAD_FALLBACK,
    GRAPH_UI_LOADING,
    GRAPH_UI_OVERVIEW,
    GRAPH_UI_UP,
  } = messages;
  const { projectId: paramProjectId } = useParams<{ projectId: string }>();
  const { activeProjectId, setActiveProjectId } = useSession();
  const projectId = routeProjectId ?? paramProjectId ?? activeProjectId ?? undefined;
  const { project } = useSync(projectId);
  const pageTitle = project?.name ?? messages.project;
  const workspaceHref = projectId ? `/projects/${projectId}` : undefined;
  const [searchParams] = useSearchParams();
  const appParam = searchParams.get('app') ?? undefined;

  const [slice, setSlice] = useState<GraphUiSlice | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(projectId));
  const [emptyState, setEmptyState] = useState<EmptyStateModel | null>(
    projectId ? null : { reason: 'no_project' },
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [screenId, setScreenId] = useState<string | null>(null);

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
    setErrorMessage(null);

    const load = screenId
      ? getGraphUiScreen(projectId, { screen: screenId, app: appParam })
      : getGraphUiOverview(projectId, { app: appParam });

    void load
      .then((data) => {
        if (cancelled) return;
        setSlice(data);
        setSelectedNodeId(null);
        if (data.empty_reason === 'no_ui_landscape') {
          setErrorMessage(GRAPH_UI_EMPTY);
        } else if (data.empty_reason === 'no_screens') {
          setErrorMessage(GRAPH_UI_EMPTY_NO_SCREENS);
        } else {
          setErrorMessage(null);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.code === 'graph_not_found') {
          setEmptyState({ reason: 'no_analysis' });
          setSlice(null);
          return;
        }
        setSlice(null);
        setErrorMessage(error instanceof Error ? error.message : GRAPH_UI_LOAD_FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    GRAPH_UI_EMPTY,
    GRAPH_UI_EMPTY_NO_SCREENS,
    GRAPH_UI_LOAD_FALLBACK,
    appParam,
    projectId,
    screenId,
  ]);

  const frames = useMemo(() => {
    if (!slice) return [];
    return screenId
      ? buildDrillFrames(slice.nodes, slice.focus_screen_id ?? screenId, messages)
      : buildOverviewFrames(slice.nodes, slice.edges, messages);
  }, [messages, screenId, slice]);

  const selectedNode = useMemo(() => {
    if (!slice || !selectedNodeId) return null;
    return slice.nodes.find((node) => node.id === selectedNodeId) ?? null;
  }, [selectedNodeId, slice]);

  const enterNode = useCallback(
    (nodeId: string) => {
      const node = slice?.nodes.find((entry) => entry.id === nodeId);
      if (!node || !canDrillKind(node.kind) || screenId) return;
      setScreenId(nodeId);
    },
    [screenId, slice],
  );

  const goUp = useCallback(() => {
    setScreenId(null);
    setSelectedNodeId(null);
  }, []);

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

  if (isLoading) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        <div className="page-chrome-header">
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
        </div>
        <div className={`page-chrome-body ${styles.loading}`}>{GRAPH_UI_LOADING}</div>
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

  if (errorMessage && (!slice || slice.nodes.length === 0)) {
    return (
      <div className={`page-chrome ${styles.page}`}>
        <div className={`page-chrome-header ${styles.header}`}>
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
        </div>
        <div className={`page-chrome-body ${styles.empty}`}>{errorMessage}</div>
      </div>
    );
  }

  if (!slice) {
    return null;
  }

  const focusLabel =
    slice.nodes.find((node) => node.id === (slice.focus_screen_id ?? screenId))?.name ??
    screenId;

  return (
    <div className={`page-chrome ${styles.page}`}>
      <div className={`page-chrome-header ${styles.header}`}>
        <div className={`page-chrome-title-row ${styles.titleRow}`}>
          <h2 className={`page-chrome-title ${styles.title}`}>{pageTitle}</h2>
          <div className={styles.navRow}>
            {screenId ? (
              <>
                <button type="button" name="up-header" onClick={goUp}>
                  {GRAPH_UI_UP}
                </button>
                <span className={styles.crumb}>
                  {GRAPH_UI_OVERVIEW} / {focusLabel}
                </span>
              </>
            ) : (
              <span className={styles.crumb}>{GRAPH_UI_OVERVIEW}</span>
            )}
          </div>
        </div>
        {errorMessage ? <div className={styles.empty}>{errorMessage}</div> : null}
      </div>

      <div className="page-chrome-body">
        <div className={styles.layout}>
          {frames.length === 0 ? (
            <div className={styles.empty}>{GRAPH_UI_EMPTY_NO_SCREENS}</div>
          ) : (
            <GraphUiViewport
              frames={frames}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              onEnterNode={enterNode}
            />
          )}
          <GraphUiInspector
            node={selectedNode}
            edges={slice.edges}
            nodes={slice.nodes}
            canEnter={Boolean(selectedNode && canDrillKind(selectedNode.kind) && !screenId)}
            onEnter={enterNode}
            showUp={Boolean(screenId)}
            onUp={goUp}
          />
        </div>
      </div>
    </div>
  );
}
