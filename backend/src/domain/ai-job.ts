export const AI_JOB_KINDS = ['docs_from_es', 'graph_from_wc'] as const;
export type AiJobKind = (typeof AI_JOB_KINDS)[number];

export const AI_JOB_STATUSES = ['running', 'succeeded', 'failed', 'cancelled'] as const;
export type AiJobStatus = (typeof AI_JOB_STATUSES)[number];

export type DocsLanguage = 'en' | 'ru';
export type DocsWriteMode = 'overwrite' | 'versioned';

export interface AiJobProgress {
  stage?: string;
  percent?: number;
  message?: string;
}

export interface AiJobProvenance {
  model_or_agent?: string;
  started_at: string;
  finished_at?: string;
}

export interface AiJobDocument {
  id: string;
  project_id: string;
  kind: AiJobKind;
  status: AiJobStatus;
  analysis_run_id: string;
  docs_language: DocsLanguage;
  docs_write_mode: DocsWriteMode;
  docs_generation_id: string | null;
  progress: AiJobProgress;
  summary: string | null;
  provenance: AiJobProvenance;
  created_at: string;
  updated_at: string;
}
