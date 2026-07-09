export type NodeKind =
  | 'file'
  | 'module'
  | 'namespace'
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'property'
  | 'field'
  | 'variable'
  | 'enum';

export interface GraphLocation {
  start_line?: number;
  start_col?: number;
  end_line?: number;
  end_col?: number;
}

export interface GraphNodeDocument {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  kind: NodeKind;
  name: string;
  qualified_name?: string | null;
  language: string;
  path: string;
  location?: GraphLocation | null;
  element_id?: string | null;
  parent_id?: string | null;
  signature?: string | null;
  metadata?: Record<string, unknown> | null;
  ingested_at: string;
}
