export type AnalysisRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

export type ParserResultStatus = 'success' | 'failed' | 'skipped' | 'missing';

export interface ChangeSet {
  project_id: string;
  incremental: boolean;
  added: string[];
  modified: string[];
  deleted: string[];
}

export interface ParserResultSummary {
  parser_id: string;
  status: ParserResultStatus;
  error_message?: string | null;
}

export interface AnalysisRunDocument {
  id: string;
  project_id: string;
  language_report_id: string;
  status: AnalysisRunStatus;
  started_at: string;
  completed_at?: string | null;
  incremental: boolean;
  change_set?: ChangeSet;
  parser_results?: ParserResultSummary[];
  last_error_message?: string | null;
  ingest_status?: string | null;
  ingest_completed_at?: string | null;
  ingest_errors?: Array<{ parser_id: string; message: string }>;
}

export type AnalysisRunPublic = AnalysisRunDocument;
