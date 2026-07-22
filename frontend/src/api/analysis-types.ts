/**
 * Hand-maintained API types for analysis (005+) and graph (006+).
 * `src/api/types.ts` is openapi-generated from 002 only — use this module for analysis/graph clients.
 */

export type ParserStatus = 'available' | 'missing' | 'failed';

export interface LanguageEntry {
  language: string;
  file_count: number;
  sample_paths: string[];
  parser_id: string | null;
  parser_status: ParserStatus;
  /** Path-scoped under a detected SPA root (020 Frontend modal). */
  frontend?: boolean;
}

export interface ArtifactEntry {
  artifact_type: string;
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
  /** Path-scoped languages under frontend-ui SPA root(s) (020). */
  frontend_languages?: LanguageEntry[];
  artifacts?: ArtifactEntry[];
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
  /** Rebuild the full graph from all files, ignoring incremental mode. */
  force_full?: boolean;
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

export type AnalysisProgressPhase = 'queued' | 'parsing' | 'ingest' | 'done';

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
  progress_phase?: AnalysisProgressPhase | null;
  progress_active_parser_id?: string | null;
  progress_parsers_completed?: number;
  progress_parsers_total?: number;
  progress_updated_at?: string | null;
}
