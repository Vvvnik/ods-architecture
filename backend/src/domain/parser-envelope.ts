export interface ParserEnvelopeDocument {
  id: string;
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  schema_version: string;
  generated_at: string;
  files_analyzed: string[];
  /**
   * Always empty in Elasticsearch. Native extract is ephemeral: orchestrator
   * ingests in-memory chunks into graph nodes/edges, then stores metadata only.
   */
  model: Record<string, unknown>;
  stored_at: string;
  /** Number of file chunks ingested for this parser (scale). */
  chunk_count?: number;
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

/** In-memory native extract passed to ingest (never persisted as full model in ES). */
export type ParserEnvelopeIngestInput = ParserEnvelopePayload;

export type ParserEnvelopePublic = ParserEnvelopePayload;
