import { z } from 'zod';

export const languageEntrySchema = z.object({
  language: z.string(),
  file_count: z.number().int(),
  sample_paths: z.array(z.string()),
  parser_id: z.string().nullable(),
  parser_status: z.enum(['available', 'missing', 'failed']),
});

export const artifactEntrySchema = z.object({
  artifact_type: z.string(),
  file_count: z.number().int(),
  sample_paths: z.array(z.string()),
  parser_id: z.string().nullable(),
  parser_status: z.enum(['available', 'missing', 'failed']),
  frontend_languages: z.array(languageEntrySchema).optional(),
});

export const languageReportSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  detected_at: z.string(),
  languages: z.array(languageEntrySchema),
  artifacts: z.array(artifactEntrySchema).default([]),
  frontend_languages: z.array(languageEntrySchema).optional(),
});

export const changeSetSchema = z.object({
  project_id: z.string().uuid(),
  incremental: z.boolean(),
  added: z.array(z.string()),
  modified: z.array(z.string()),
  deleted: z.array(z.string()),
});

export const startAnalysisRunSchema = z.object({
  language_report_id: z.string().uuid(),
  confirmed_change_set: z.boolean().default(true),
  /** Deprecated: analysis is always a full graph rebuild. */
  force_full: z.boolean().default(true),
});

export const parserResultSummarySchema = z.object({
  parser_id: z.string(),
  status: z.enum(['success', 'failed', 'skipped', 'missing']),
  error_message: z.string().nullable().optional(),
});

export const analysisProgressPhaseSchema = z.enum(['queued', 'parsing', 'ingest', 'done']);

export const analysisRunSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  language_report_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'running', 'success', 'partial', 'failed', 'cancelled']),
  started_at: z.string(),
  completed_at: z.string().nullable().optional(),
  incremental: z.boolean(),
  change_set: changeSetSchema.optional(),
  parser_results: z.array(parserResultSummarySchema).optional(),
  last_error_message: z.string().nullable().optional(),
  progress_phase: analysisProgressPhaseSchema.nullable().optional(),
  progress_active_parser_id: z.string().nullable().optional(),
  progress_parsers_completed: z.number().int().nonnegative().optional(),
  progress_parsers_total: z.number().int().nonnegative().optional(),
  progress_updated_at: z.string().nullable().optional(),
});

export const parserEnvelopeSchema = z.object({
  parser_id: z.string(),
  schema_version: z.string(),
  project_id: z.string().uuid(),
  analysis_run_id: z.string().uuid(),
  generated_at: z.string(),
  files_analyzed: z.array(z.string()),
  model: z.record(z.unknown()),
});

export const listRunsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
});
