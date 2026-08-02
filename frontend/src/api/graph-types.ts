export interface GraphLocation {
  start_line?: number;
  start_col?: number;
  end_line?: number;
  end_col?: number;
}

export interface GraphNode {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  kind: string;
  name: string;
  qualified_name?: string;
  language: string;
  path: string;
  location?: GraphLocation | null;
  element_id?: string | null;
  parent_id?: string | null;
  signature?: string | null;
  metadata?: Record<string, unknown> | null;
  has_children?: boolean;
}

export interface GraphEdge {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  language: string;
  from: string;
  to: string;
  type: string;
  path?: string | null;
  location?: GraphLocation | null;
  metadata?: Record<string, unknown> | null;
}

export interface GraphSummary {
  project_id: string;
  analysis_run_id: string;
  graph_builder?: 'parsers' | 'ai';
  ingest_status?: 'success' | 'partial';
  node_count: number;
  edge_count: number;
  languages?: string[];
}

export interface GraphNodeList {
  items: GraphNode[];
  total: number;
  limit: number;
  offset: number;
  analysis_run_id?: string;
}

export interface GraphEdgeList {
  items: GraphEdge[];
  total?: number;
  limit?: number;
  offset?: number;
  analysis_run_id?: string;
}

export interface GraphSearchResult {
  q: string;
  nodes: GraphNodeList;
  edges: GraphEdgeList;
}

export interface GraphNodeAncestors {
  node_id: string;
  ancestors: GraphNode[];
}

export interface FileGraphResponse {
  path: string;
  analysis_run_id?: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ListGraphNodesParams {
  analysis_run_id?: string;
  path?: string;
  kind?: string;
  parent_id?: string;
  limit?: number;
  offset?: number;
}

export interface ListGraphNodeEdgesParams {
  analysis_run_id?: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  limit?: number;
}

export type GraphViewNodeRole = 'focus' | 'inside' | 'external';

export interface GraphViewNode extends GraphNode {
  role: GraphViewNodeRole;
  stub: boolean;
}

export interface GraphViewEdge extends GraphEdge {}

export interface GraphViewSlice {
  project_id: string;
  analysis_run_id: string;
  graph_builder?: 'parsers' | 'ai';
  focus_id: string | null;
  focus_kind: string | null;
  layer: 'system' | 'code';
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
  resolve_status:
    | 'exact'
    | 'exact_code'
    | 'resolved_service'
    | 'system_fallback'
    | 'none';
  empty_reason: 'none' | 'no_system_participants' | 'no_graph' | 'no_related_code';
  affiliation: {
    mode: 'explicit' | 'view_only' | 'none';
    service_id: string | null;
  } | null;
}

export interface GetGraphViewParams {
  analysis_run_id?: string;
  focus?: string;
  resolve_from?: string;
  layer?: 'system' | 'code';
  max_nodes?: number;
  max_edges?: number;
}

/** UI landscape slice (020 Graph UI). */
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

export type GraphUiEmptyReason = 'no_ui_landscape' | 'no_screens' | 'unknown';

export interface GraphUiSlice {
  project_id: string;
  analysis_run_id: string;
  app_id?: string | null;
  focus_screen_id?: string | null;
  empty_reason?: GraphUiEmptyReason | null;
  nodes: GraphUiNode[];
  edges: GraphUiEdge[];
}

export interface GetGraphUiOverviewParams {
  app?: string;
  analysis_run_id?: string;
}

export interface GetGraphUiScreenParams {
  screen: string;
  app?: string;
  analysis_run_id?: string;
}
