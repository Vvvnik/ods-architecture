import { AppError } from '../domain/errors.js';
import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import type { GraphNodeDocument, NodeKind } from '../domain/graph-node.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import { resolveLatestGraphRunId } from './graph-run-resolver.js';

export const UI_KINDS: NodeKind[] = [
  'ui_app',
  'ui_module',
  'ui_route',
  'ui_screen',
  'ui_frame',
  'ui_component',
  'ui_control',
  'ui_flow',
  'ui_style',
  'ui_surface',
];

export const OVERVIEW_KINDS: NodeKind[] = [
  'ui_app',
  'ui_route',
  'ui_screen',
  'ui_flow',
];

export type GraphUiEmptyReason = 'no_ui_landscape' | 'no_screens' | 'unknown' | null;

export interface GraphUiNode {
  id: string;
  kind: string;
  name: string;
  qualified_name?: string;
  path?: string;
  signature?: string;
  parent_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GraphUiEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  metadata?: Record<string, unknown> | null;
}

export interface GraphUiSlice {
  project_id: string;
  analysis_run_id: string;
  app_id: string | null;
  focus_screen_id: string | null;
  empty_reason: GraphUiEmptyReason;
  nodes: GraphUiNode[];
  edges: GraphUiEdge[];
}

function toPublicNode(node: GraphNodeDocument): GraphUiNode {
  return {
    id: node.id,
    kind: node.kind,
    name: node.name,
    qualified_name: node.qualified_name ?? undefined,
    path: node.path,
    signature: node.signature ?? undefined,
    parent_id: node.parent_id ?? undefined,
    metadata: node.metadata ?? null,
  };
}

function toPublicEdge(edge: GraphEdgeDocument): GraphUiEdge {
  return {
    id: edge.id,
    from: edge.from,
    to: edge.to,
    type: edge.type,
    metadata: edge.metadata ?? null,
  };
}

function isUiLayer(node: GraphNodeDocument): boolean {
  return node.metadata?.layer === 'ui' || node.kind.startsWith('ui_');
}

export class GraphUiService {
  constructor(
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
  ) {}

  async getOverview(
    projectId: string,
    options: { app?: string; analysisRunId?: string } = {},
  ): Promise<GraphUiSlice> {
    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const { items: uiNodes } = await this.graphNodeRepository.listByKinds(
      projectId,
      runId,
      UI_KINDS,
      { limit: 2000, offset: 0 },
    );
    const apps = uiNodes.filter((node) => node.kind === 'ui_app' && isUiLayer(node));
    if (apps.length === 0) {
      return emptySlice(projectId, runId, 'no_ui_landscape');
    }

    const app = pickApp(apps, options.app);
    if (!app) {
      return emptySlice(projectId, runId, 'no_ui_landscape');
    }

    const appSubtree = collectSubtree(uiNodes, app.id);
    const overviewNodes = [...appSubtree.values()].filter((node) =>
      OVERVIEW_KINDS.includes(node.kind as NodeKind),
    );
    const hasScreens = overviewNodes.some(
      (node) => node.kind === 'ui_screen' || node.kind === 'ui_route',
    );
    if (!hasScreens) {
      return {
        project_id: projectId,
        analysis_run_id: runId,
        app_id: app.id,
        focus_screen_id: null,
        empty_reason: 'no_screens',
        nodes: overviewNodes.map(toPublicNode),
        edges: [],
      };
    }

    const seedIds = overviewNodes.map((node) => node.id);
    const edges = await this.graphEdgeRepository.listIncidentToNodes(
      projectId,
      runId,
      seedIds,
      3000,
    );
    const seedSet = new Set(seedIds);
    const filteredEdges = edges.filter((edge) => {
      if (seedSet.has(edge.from) && seedSet.has(edge.to)) {
        return true;
      }
      // ui_app → compose service (Graph view → UI graph action)
      if (edge.type === 'binds_service' && seedSet.has(edge.from)) {
        return true;
      }
      return false;
    });

    return {
      project_id: projectId,
      analysis_run_id: runId,
      app_id: app.id,
      focus_screen_id: null,
      empty_reason: null,
      nodes: overviewNodes.map(toPublicNode),
      edges: filteredEdges.map(toPublicEdge),
    };
  }

  async getScreen(
    projectId: string,
    options: { screen: string; app?: string; analysisRunId?: string },
  ): Promise<GraphUiSlice> {
    const { runId } = await this.resolveRun(projectId, options.analysisRunId);
    const focus = await this.graphNodeRepository.getByLogicalId(
      projectId,
      runId,
      options.screen,
    );
    if (!focus || (focus.kind !== 'ui_screen' && focus.kind !== 'ui_route')) {
      throw new AppError('not_found', undefined, 404);
    }

    const { items: uiNodes } = await this.graphNodeRepository.listByKinds(
      projectId,
      runId,
      UI_KINDS,
      { limit: 2000, offset: 0 },
    );

    const apps = uiNodes.filter((node) => node.kind === 'ui_app');
    const app = pickApp(apps, options.app) ?? findAncestorApp(uiNodes, focus);
    const screenRoot =
      focus.kind === 'ui_screen'
        ? focus
        : uiNodes.find((node) => node.kind === 'ui_screen' && node.parent_id === focus.id) ??
          focus;

    const screenSubtree = collectSubtree(uiNodes, screenRoot.id);
    // Ancestor crumbs (route/app) for context — do NOT expand their sibling children.
    const crumbNodes: GraphNodeDocument[] = [];
    let parentId = screenRoot.parent_id;
    const guard = new Set<string>();
    while (parentId && !guard.has(parentId)) {
      guard.add(parentId);
      const parent = uiNodes.find((node) => node.id === parentId);
      if (!parent) {
        break;
      }
      crumbNodes.push(parent);
      parentId = parent.parent_id;
    }

    const seedIds = [...screenSubtree.keys()];
    const rawEdges = await this.graphEdgeRepository.listIncidentToNodes(
      projectId,
      runId,
      seedIds,
      3000,
    );

    const CROSS_EDGE_TYPES = new Set([
      'invokes_api',
      'opens_flow',
      'binds_field',
      'uses_style',
      'navigates_to',
    ]);
    const edges = rawEdges.filter((edge) => {
      const fromIn = screenSubtree.has(edge.from);
      const toIn = screenSubtree.has(edge.to);
      if (fromIn && toIn) {
        return true;
      }
      if (fromIn && CROSS_EDGE_TYPES.has(edge.type)) {
        return true;
      }
      if (toIn && CROSS_EDGE_TYPES.has(edge.type)) {
        return true;
      }
      return false;
    });

    const byId = new Map(screenSubtree);
    for (const crumb of crumbNodes) {
      byId.set(crumb.id, crumb);
    }

    // Pull only external targets of filtered cross edges (API hints, etc.).
    for (const edge of edges) {
      for (const id of [edge.from, edge.to]) {
        if (byId.has(id)) {
          continue;
        }
        const node = await this.graphNodeRepository.getByLogicalId(projectId, runId, id);
        if (node) {
          byId.set(node.id, node);
        }
      }
    }

    return {
      project_id: projectId,
      analysis_run_id: runId,
      app_id: app?.id ?? null,
      focus_screen_id: screenRoot.id,
      empty_reason: null,
      nodes: [...byId.values()].map(toPublicNode),
      edges: edges.map(toPublicEdge),
    };
  }

  private async resolveRun(
    projectId: string,
    analysisRunId?: string,
  ): Promise<{ runId: string }> {
    if (analysisRunId) {
      const run = await this.analysisRunRepository.getById(analysisRunId);
      if (!run || run.project_id !== projectId) {
        throw new AppError('analysis_run_not_found', undefined, 404);
      }
      return { runId: run.id };
    }

    const runs = await this.analysisRunRepository.listByProjectId(projectId, 50);
    // Prefer latest ready run that already has UI nodes; fall back to latest graph run.
    for (const run of runs) {
      if (run.status !== 'success' && run.status !== 'partial') {
        continue;
      }
      if (run.ingest_status !== 'success' && run.ingest_status !== 'partial') {
        continue;
      }
      const { total } = await this.graphNodeRepository.listByKinds(
        projectId,
        run.id,
        ['ui_app'],
        { limit: 1, offset: 0 },
      );
      if (total > 0) {
        return { runId: run.id };
      }
    }

    const latestRunId = await resolveLatestGraphRunId(runs, (runId) =>
      this.graphNodeRepository.countByProjectAndRun(projectId, runId),
    );
    if (!latestRunId) {
      throw new AppError('graph_not_found', undefined, 404);
    }
    return { runId: latestRunId };
  }
}

function emptySlice(
  projectId: string,
  runId: string,
  reason: GraphUiEmptyReason,
): GraphUiSlice {
  return {
    project_id: projectId,
    analysis_run_id: runId,
    app_id: null,
    focus_screen_id: null,
    empty_reason: reason,
    nodes: [],
    edges: [],
  };
}

function pickApp(apps: GraphNodeDocument[], appId?: string): GraphNodeDocument | null {
  if (apps.length === 0) {
    return null;
  }
  if (appId) {
    return apps.find((app) => app.id === appId) ?? null;
  }
  return apps[0] ?? null;
}

function findAncestorApp(
  nodes: GraphNodeDocument[],
  start: GraphNodeDocument,
): GraphNodeDocument | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  let current: GraphNodeDocument | undefined = start;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    if (current.kind === 'ui_app') {
      return current;
    }
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return null;
}

function collectSubtree(
  nodes: GraphNodeDocument[],
  rootId: string,
): Map<string, GraphNodeDocument> {
  const byParent = new Map<string, GraphNodeDocument[]>();
  for (const node of nodes) {
    if (!node.parent_id) {
      continue;
    }
    const list = byParent.get(node.parent_id) ?? [];
    list.push(node);
    byParent.set(node.parent_id, list);
  }

  const result = new Map<string, GraphNodeDocument>();
  const root = nodes.find((node) => node.id === rootId);
  if (!root) {
    return result;
  }
  const queue = [root];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current.id)) {
      continue;
    }
    result.set(current.id, current);
    for (const child of byParent.get(current.id) ?? []) {
      queue.push(child);
    }
  }
  return result;
}
