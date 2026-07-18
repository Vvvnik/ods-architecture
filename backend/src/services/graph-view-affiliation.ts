/**
 * View-only code↔service affiliation (012). Does not write to ES.
 * Prefer strategy documented in tasks Notes: (A) path-prefix / name segment.
 */

import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';

export type AffiliationMode = 'explicit' | 'view_only' | 'none';

export interface ServiceCodeAffiliation {
  service_id: string;
  service_name: string;
  code_node_ids: string[];
  mode: AffiliationMode;
}

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

export function isCodeKind(kind: string): boolean {
  return CODE_KINDS.has(kind);
}

export function isCodeLayerNode(node: GraphNodeDocument): boolean {
  return node.metadata?.layer === 'code' || isCodeKind(node.kind);
}

/** Normalize path and test if a path segment equals service name (case-insensitive). */
export function pathMatchesServiceName(codePath: string, serviceName: string): boolean {
  const name = serviceName.trim().toLowerCase();
  if (!name) {
    return false;
  }
  const parts = codePath.replace(/\\/g, '/').toLowerCase().split('/').filter(Boolean);
  return parts.includes(name);
}

function explicitLinkedToService(
  code: GraphNodeDocument,
  serviceId: string,
  byId: Map<string, GraphNodeDocument>,
  edges: GraphEdgeDocument[],
): boolean {
  if (code.parent_id === serviceId) {
    return true;
  }
  let current: GraphNodeDocument | undefined = code;
  const guard = new Set<string>();
  while (current?.parent_id && !guard.has(current.parent_id)) {
    guard.add(current.parent_id);
    const parent = byId.get(current.parent_id);
    if (!parent) {
      break;
    }
    if (parent.id === serviceId || parent.kind === 'service') {
      return parent.id === serviceId;
    }
    current = parent;
  }
  return edges.some(
    (e) =>
      (e.from === serviceId && e.to === code.id) ||
      (e.to === serviceId && e.from === code.id),
  );
}

/**
 * Match code nodes to a compose/service node without writing canon.
 * Tie-break: longer matching path segment depth, then stable id sort.
 */
export function matchCodeToService(
  service: GraphNodeDocument,
  codeNodes: GraphNodeDocument[],
  allNodes: GraphNodeDocument[],
  edges: GraphEdgeDocument[] = [],
): ServiceCodeAffiliation {
  const byId = new Map(allNodes.map((n) => [n.id, n]));
  const explicit: GraphNodeDocument[] = [];
  const viewOnly: GraphNodeDocument[] = [];

  for (const code of codeNodes) {
    if (!isCodeLayerNode(code)) {
      continue;
    }
    if (explicitLinkedToService(code, service.id, byId, edges)) {
      explicit.push(code);
      continue;
    }
    if (pathMatchesServiceName(code.path ?? '', service.name)) {
      viewOnly.push(code);
    }
  }

  if (explicit.length > 0) {
    const ids = [...new Set(explicit.map((n) => n.id))].sort();
    return {
      service_id: service.id,
      service_name: service.name,
      code_node_ids: ids,
      mode: 'explicit',
    };
  }

  if (viewOnly.length > 0) {
    const ids = [...new Set(viewOnly.map((n) => n.id))].sort();
    return {
      service_id: service.id,
      service_name: service.name,
      code_node_ids: ids,
      mode: 'view_only',
    };
  }

  return {
    service_id: service.id,
    service_name: service.name,
    code_node_ids: [],
    mode: 'none',
  };
}

/** Code roots under a service: affiliated nodes whose parent is not in the affiliated set. */
export function selectAffiliatedCodeRoots(
  affiliatedIds: Set<string>,
  byId: Map<string, GraphNodeDocument>,
): GraphNodeDocument[] {
  const roots: GraphNodeDocument[] = [];
  for (const id of affiliatedIds) {
    const node = byId.get(id);
    if (!node) {
      continue;
    }
    const parentInSet = node.parent_id != null && affiliatedIds.has(node.parent_id);
    if (!parentInSet) {
      roots.push(node);
    }
  }
  return roots.sort((a, b) => a.id.localeCompare(b.id));
}
