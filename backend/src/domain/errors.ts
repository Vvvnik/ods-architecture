export const ERROR_CODES = [
  'source_unreachable',
  'sync_in_progress',
  'analysis_in_progress',
  'encoding_unsupported',
  'file_not_available',
  'not_found',
  'language_report_not_found',
  'analysis_run_not_found',
  'graph_not_found',
  'graph_node_not_found',
  'ingest_adapter_missing',
  'cascade_too_large',
  'cascade_failed',
  'docs_path_invalid',
  'docs_agent_file_reserved',
  'ai_job_not_found',
  'ai_job_not_current',
  'graph_not_ready',
  'docs_export_not_ready',
  'validation_error',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  source_unreachable: 'Project source is unavailable',
  sync_in_progress: 'Synchronization is already in progress',
  analysis_in_progress: 'Analysis is already in progress',
  encoding_unsupported: 'File encoding is not supported',
  file_not_available: 'File is unavailable',
  not_found: 'Resource not found',
  language_report_not_found: 'Language report has not been created yet',
  analysis_run_not_found: 'Analysis run not found',
  graph_not_found: 'The project graph has not been built yet. Run analysis.',
  graph_node_not_found: 'Graph node not found',
  ingest_adapter_missing: 'Ingest adapter for parser not found',
  cascade_too_large:
    'The branch is too large for a status cascade (more than 5,000 elements). Update specific elements or split the operation.',
  cascade_failed: 'Failed to apply the status cascade. Statuses were not changed.',
  docs_path_invalid: 'Documentation path is invalid',
  docs_agent_file_reserved: 'AGENT.md is managed by ODS and cannot be changed by an agent',
  ai_job_not_found: 'AI job not found',
  ai_job_not_current: 'AI job is not the current running job',
  graph_not_ready: 'A graph-ready analysis run is required',
  docs_export_not_ready: 'Export is available only after a successful docs job',
  validation_error: 'Request validation failed',
  internal_error: 'Internal server error',
};

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message?: string,
    public readonly statusCode: number = 400,
  ) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export function messageForCode(code: ErrorCode): string {
  return ERROR_MESSAGES[code];
}
