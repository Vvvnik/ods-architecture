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
