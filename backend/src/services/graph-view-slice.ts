import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';
import {
  DEFAULT_MAX_EDGES,
  DEFAULT_MAX_NODES,
  SYSTEM_INSIDE_KINDS,
  SYSTEM_PEER_KINDS,
  type GraphViewEdge,
  type GraphViewEmptyReason,
  type GraphViewNode,
  type GraphViewResolveStatus,
  type GraphViewSlice,
  type ViewNodeRole,
} from './graph-view.types.js';

function toViewNode(
  node: GraphNodeDocument,
  role: ViewNodeRole,
  stub: boolean,
): GraphViewNode {
  return {
    id: node.id,
    project_id: node.project_id,
    analysis_run_id: node.analysis_run_id,
    parser_id: node.parser_id,
    kind: node.kind,
    name: node.name,
    qualified_name: node.qualified_name,
    language: node.language,
    path: node.path,
    parent_id: node.parent_id,
    metadata: node.metadata,
    role,
    stub,
  };
}

function toViewEdge(edge: GraphEdgeDocument): GraphViewEdge {
  return {
    id: edge.id,
    project_id: edge.project_id,
    analysis_run_id: edge.analysis_run_id,
    parser_id: edge.parser_id,
    language: edge.language,
    from: edge.from,
    to: edge.to,
    type: edge.type,
    path: edge.path,
    metadata: edge.metadata,
  };
}

function degreeMap(
  nodeIds: Set<string>,
  edges: GraphEdgeDocument[],
): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const id of nodeIds) {
    degrees.set(id, 0);
  }
  for (const edge of edges) {
    if (nodeIds.has(edge.from)) {
      degrees.set(edge.from, (degrees.get(edge.from) ?? 0) + 1);
    }
    if (nodeIds.has(edge.to)) {
      degrees.set(edge.to, (degrees.get(edge.to) ?? 0) + 1);
    }
  }
  return degrees;
}

/** Truncate System-level peers: services first, then infra by degree. */
export function truncateSystemPeers(
  peers: GraphNodeDocument[],
  edges: GraphEdgeDocument[],
  maxNodes: number,
): { kept: GraphNodeDocument[]; omitted: number } {
  if (peers.length <= maxNodes) {
    return { kept: peers, omitted: 0 };
  }

  const peerIds = new Set(peers.map((p) => p.id));
  const degrees = degreeMap(peerIds, edges);
  const services = peers.filter((p) => p.kind === 'service');
  const infra = peers
    .filter((p) => p.kind !== 'service')
    .sort((a, b) => (degrees.get(b.id) ?? 0) - (degrees.get(a.id) ?? 0));

  const kept: GraphNodeDocument[] = [];
  for (const node of [...services, ...infra]) {
    if (kept.length >= maxNodes) {
      break;
    }
    kept.push(node);
  }
  return { kept, omitted: peers.length - kept.length };
}

function filterEdgesToNodes(
  edges: GraphEdgeDocument[],
  nodeIds: Set<string>,
  maxEdges: number,
): { kept: GraphEdgeDocument[]; omitted: number } {
  const matching = edges.filter(
    (edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to),
  );
  if (matching.length <= maxEdges) {
    return { kept: matching, omitted: 0 };
  }
  return {
    kept: matching.slice(0, maxEdges),
    omitted: matching.length - maxEdges,
  };
}

export function isSystemLayer(node: GraphNodeDocument): boolean {
  return node.metadata?.layer === 'system' || SYSTEM_PEER_KINDS.has(node.kind) || SYSTEM_INSIDE_KINDS.has(node.kind);
}

/** System peers for root view; topics peer only if no broker. */
export function selectSystemPeers(allNodes: GraphNodeDocument[]): GraphNodeDocument[] {
  const hasBroker = allNodes.some((n) => n.kind === 'broker');
  return allNodes.filter((node) => {
    if (node.kind === 'message_topic' || node.kind === 'message_type') {
      return !hasBroker;
    }
    return SYSTEM_PEER_KINDS.has(node.kind);
  });
}

export function resolveServiceContext(
  start: GraphNodeDocument,
  byId: Map<string, GraphNodeDocument>,
  allNodes: GraphNodeDocument[],
): { service: GraphNodeDocument | null; status: GraphViewResolveStatus } {
  if (start.kind === 'service') {
    return { service: start, status: 'exact' };
  }

  let current: GraphNodeDocument | undefined = start;
  const guard = new Set<string>();
  while (current?.parent_id && !guard.has(current.parent_id)) {
    guard.add(current.parent_id);
    const parent = byId.get(current.parent_id);
    if (!parent) {
      break;
    }
    if (parent.kind === 'service') {
      return { service: parent, status: 'resolved_service' };
    }
    current = parent;
  }

  if (start.path) {
    const services = allNodes.filter((n) => n.kind === 'service');
    let best: GraphNodeDocument | null = null;
    let bestLen = -1;
    for (const service of services) {
      const prefix = service.path?.replace(/\/$/, '') ?? '';
      if (!prefix) {
        continue;
      }
      if (
        (start.path === prefix || start.path.startsWith(`${prefix}/`)) &&
        prefix.length > bestLen
      ) {
        best = service;
        bestLen = prefix.length;
      }
    }
    if (best) {
      return { service: best, status: 'resolved_service' };
    }
  }

  return { service: null, status: 'system_fallback' };
}

function insideForFocus(
  focus: GraphNodeDocument,
  allNodes: GraphNodeDocument[],
): GraphNodeDocument[] {
  if (focus.kind === 'database' || focus.kind === 'storage' || focus.kind === 'external_api') {
    return [];
  }

  if (focus.kind === 'broker') {
    return allNodes.filter(
      (n) =>
        (n.kind === 'message_topic' || n.kind === 'message_type') &&
        (n.parent_id === focus.id ||
          (typeof n.metadata?.broker_id === 'string' && n.metadata.broker_id === focus.id)),
    );
  }

  if (focus.kind === 'service') {
    return allNodes.filter(
      (n) =>
        isSystemLayer(n) &&
        n.id !== focus.id &&
        (n.parent_id === focus.id ||
          (SYSTEM_INSIDE_KINDS.has(n.kind) &&
            (n.parent_id === focus.id ||
              (typeof n.path === 'string' &&
                focus.path &&
                (n.path === focus.path || n.path.startsWith(`${focus.path}/`)))))),
    );
  }

  return allNodes.filter((n) => n.parent_id === focus.id && isSystemLayer(n));
}

export function buildViewSlicePure(input: {
  projectId: string;
  analysisRunId: string;
  allNodes: GraphNodeDocument[];
  allEdges: GraphEdgeDocument[];
  focusId?: string | null;
  resolveFromId?: string | null;
  maxNodes?: number;
  maxEdges?: number;
}): GraphViewSlice {
  const maxNodes = input.maxNodes ?? DEFAULT_MAX_NODES;
  const maxEdges = input.maxEdges ?? DEFAULT_MAX_EDGES;
  const byId = new Map(input.allNodes.map((n) => [n.id, n]));

  let resolveStatus: GraphViewResolveStatus = 'none';
  let focusId = input.focusId ?? null;

  if (input.resolveFromId) {
    const start = byId.get(input.resolveFromId);
    if (start) {
      if (SYSTEM_PEER_KINDS.has(start.kind) || start.kind === 'message_topic') {
        focusId = start.id;
        resolveStatus = 'exact';
      } else {
        const resolved = resolveServiceContext(start, byId, input.allNodes);
        resolveStatus = resolved.status;
        focusId = resolved.service?.id ?? null;
      }
    } else {
      resolveStatus = 'system_fallback';
      focusId = null;
    }
  } else if (focusId) {
    resolveStatus = 'exact';
  }

  if (!focusId) {
    const peers = selectSystemPeers(input.allNodes);
    const peerIds = new Set(peers.map((p) => p.id));
    const peerEdges = input.allEdges.filter(
      (e) => peerIds.has(e.from) && peerIds.has(e.to),
    );
    const { kept, omitted } = truncateSystemPeers(peers, peerEdges, maxNodes);
    const keptIds = new Set(kept.map((n) => n.id));
    const { kept: edgesKept, omitted: omittedEdges } = filterEdgesToNodes(
      peerEdges,
      keptIds,
      maxEdges,
    );

    let emptyReason: GraphViewEmptyReason = 'none';
    if (kept.length === 0) {
      emptyReason =
        input.allNodes.length === 0 ? 'no_graph' : 'no_system_participants';
    }

    return {
      project_id: input.projectId,
      analysis_run_id: input.analysisRunId,
      focus_id: null,
      focus_kind: null,
      nodes: kept.map((n) => toViewNode(n, 'inside', false)),
      edges: edgesKept.map(toViewEdge),
      truncated: omitted > 0 || omittedEdges > 0,
      limits: { max_nodes: maxNodes, max_edges: maxEdges },
      counts: {
        nodes: kept.length,
        edges: edgesKept.length,
        omitted_nodes: omitted || undefined,
        omitted_edges: omittedEdges || undefined,
      },
      resolve_status: resolveStatus === 'none' ? 'none' : resolveStatus,
      empty_reason: emptyReason,
    };
  }

  const focus = byId.get(focusId);
  if (!focus) {
    return buildViewSlicePure({
      ...input,
      focusId: null,
      resolveFromId: null,
    });
  }

  const inside = insideForFocus(focus, input.allNodes);
  const coreIds = new Set<string>([focus.id, ...inside.map((n) => n.id)]);
  const incident = input.allEdges.filter(
    (e) => coreIds.has(e.from) || coreIds.has(e.to),
  );

  const externalIds = new Set<string>();
  for (const edge of incident) {
    if (!coreIds.has(edge.from)) {
      externalIds.add(edge.from);
    }
    if (!coreIds.has(edge.to)) {
      externalIds.add(edge.to);
    }
  }

  const viewNodes: GraphViewNode[] = [
    toViewNode(focus, 'focus', false),
    ...inside.map((n) => toViewNode(n, 'inside', false)),
  ];

  let omittedNodes = 0;
  for (const extId of externalIds) {
    if (viewNodes.length >= maxNodes) {
      omittedNodes += 1;
      continue;
    }
    const node = byId.get(extId);
    if (!node) {
      continue;
    }
    viewNodes.push(toViewNode(node, 'external', true));
  }

  const nodeIds = new Set(viewNodes.map((n) => n.id));
  const { kept: edgesKept, omitted: omittedEdges } = filterEdgesToNodes(
    incident,
    nodeIds,
    maxEdges,
  );

  return {
    project_id: input.projectId,
    analysis_run_id: input.analysisRunId,
    focus_id: focus.id,
    focus_kind: focus.kind,
    nodes: viewNodes,
    edges: edgesKept.map(toViewEdge),
    truncated: omittedNodes > 0 || omittedEdges > 0,
    limits: { max_nodes: maxNodes, max_edges: maxEdges },
    counts: {
      nodes: viewNodes.length,
      edges: edgesKept.length,
      omitted_nodes: omittedNodes || undefined,
      omitted_edges: omittedEdges || undefined,
    },
    resolve_status: resolveStatus,
    empty_reason: 'none',
  };
}
