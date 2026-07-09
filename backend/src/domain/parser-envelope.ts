export interface ParserEnvelopeDocument {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  schema_version: string;
  generated_at: string;
  files_analyzed: string[];
  model: Record<string, unknown>;
  stored_at: string;
}

export interface ParserEnvelopePayload {
  parser_id: string;
  schema_version: string;
  project_id: string;
  analysis_run_id: string;
  generated_at: string;
  files_analyzed: string[];
  model: Record<string, unknown>;
}

export type ParserEnvelopePublic = ParserEnvelopePayload;
