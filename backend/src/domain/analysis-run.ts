export type AnalysisRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

/** Who produced the Canon graph for this run (027 provenance). */
export type GraphBuilder = 'parsers' | 'ai';

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

/** Canonical progress phases for analysis run (010). Sync uses project.sync_status. */
export type AnalysisProgressPhase = 'queued' | 'parsing' | 'ingest' | 'done';

export interface AnalysisRunDocument {
  id: string;
  project_id: string;
  language_report_id: string;
  status: AnalysisRunStatus;
  started_at: string;
  completed_at?: string | null;
  incremental: boolean;
  /** Provenance of the graph; defaults to `parsers` for pre-027 documents. */
  graph_builder: GraphBuilder;
  change_set?: ChangeSet;
  parser_results?: ParserResultSummary[];
  last_error_message?: string | null;
  ingest_status?: string | null;
  ingest_completed_at?: string | null;
  ingest_errors?: Array<{ parser_id: string; message: string }>;
  progress_phase?: AnalysisProgressPhase | null;
  progress_active_parser_id?: string | null;
  progress_parsers_completed?: number;
  progress_parsers_total?: number;
  progress_updated_at?: string | null;
}

export type AnalysisRunPublic = AnalysisRunDocument;
