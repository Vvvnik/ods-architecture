export type EdgeType =
  | 'imports'
  | 'exports'
  | 'calls'
  | 'inherits'
  | 'implements'
  | 'references'
  | 'contains'
  | 'injects'
  | 'depends_on'
  | 'project_reference'
  | 'http_calls'
  | 'exposes'
  | 'publishes'
  | 'consumes'
  | 'connects_to'
  | 'rpc_handles'
  | 'documents';

export interface GraphEdgeDocument {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  language: string;
  from: string;
  to: string;
  type: EdgeType;
  path?: string | null;
  location?: {
    start_line?: number;
    start_col?: number;
    end_line?: number;
    end_col?: number;
  } | null;
  metadata?: Record<string, unknown> | null;
  ingested_at: string;
}
