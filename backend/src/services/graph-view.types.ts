import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';

export const DEFAULT_MAX_NODES = 200;
export const DEFAULT_MAX_EDGES = 500;

/** Peer kinds on System level (topics normally inside broker). */
export const SYSTEM_PEER_KINDS = new Set([
  'service',
  'database',
  'broker',
  'external_api',
  'storage',
]);

export const SYSTEM_INSIDE_KINDS = new Set([
  'http_endpoint',
  'dotnet_project',
  'message_topic',
  'message_type',
]);

export type ViewNodeRole = 'focus' | 'inside' | 'external';

export type GraphViewResolveStatus =
  | 'exact'
  | 'resolved_service'
  | 'system_fallback'
  | 'none';

export type GraphViewEmptyReason = 'none' | 'no_system_participants' | 'no_graph';

export interface GraphViewNode {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  kind: string;
  name: string;
  qualified_name?: string | null;
  language: string;
  path: string;
  parent_id?: string | null;
  metadata?: Record<string, unknown> | null;
  role: ViewNodeRole;
  stub: boolean;
}

export interface GraphViewEdge {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  language: string;
  from: string;
  to: string;
  type: string;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GraphViewSlice {
  project_id: string;
  analysis_run_id: string;
  focus_id: string | null;
  focus_kind: string | null;
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  truncated: boolean;
  limits: { max_nodes: number; max_edges: number };
  counts: {
    nodes: number;
    edges: number;
    omitted_nodes?: number;
    omitted_edges?: number;
  };
  resolve_status: GraphViewResolveStatus;
  empty_reason: GraphViewEmptyReason;
}

export type PublicNode = Omit<GraphNodeDocument, 'ingested_at'>;
export type PublicEdge = Omit<GraphEdgeDocument, 'ingested_at'>;
