export type ParserStatus = 'available' | 'missing' | 'failed';

export interface LanguageEntry {
  language: string;
  file_count: number;
  sample_paths: string[];
  parser_id: string | null;
  parser_status: ParserStatus;
}

export interface LanguageReport {
  id: string;
  project_id: string;
  detected_at: string;
  sync_id?: string | null;
  languages: LanguageEntry[];
}

export interface ChangeSet {
  project_id: string;
  incremental: boolean;
  added: string[];
  modified: string[];
  deleted: string[];
}

export interface StartAnalysisRunRequest {
  language_report_id: string;
  confirmed_change_set?: boolean;
}

export type AnalysisRunStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'partial'
  | 'failed'
  | 'cancelled';

export interface ParserResultSummary {
  parser_id: string;
  status: 'success' | 'failed' | 'skipped' | 'missing';
  error_message?: string | null;
}

export interface AnalysisRun {
  id: string;
  project_id: string;
  language_report_id?: string;
  status: AnalysisRunStatus;
  started_at: string;
  completed_at?: string | null;
  incremental: boolean;
  change_set?: ChangeSet;
  parser_results?: ParserResultSummary[];
  last_error_message?: string | null;
}
