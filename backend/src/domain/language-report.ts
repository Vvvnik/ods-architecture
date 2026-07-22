export type ParserStatus = 'available' | 'missing' | 'failed';

export interface LanguageEntry {
  language: string;
  file_count: number;
  sample_paths: string[];
  parser_id: string | null;
  parser_status: ParserStatus;
}

export interface ArtifactEntry {
  artifact_type: string;
  file_count: number;
  sample_paths: string[];
  parser_id: string | null;
  parser_status: ParserStatus;
  /** Path-scoped languages under SPA root(s) for frontend-ui (FR-017). */
  frontend_languages?: LanguageEntry[];
}

export interface LanguageReportDocument {
  id: string;
  project_id: string;
  detected_at: string;
  sync_id?: string | null;
  languages: LanguageEntry[];
  artifacts: ArtifactEntry[];
  /**
   * Path-scoped frontend languages under detected SPA root(s).
   * Prefer over unmarked global typescript/javascript rows for modal Frontend block.
   */
  frontend_languages?: LanguageEntry[];
}

export type LanguageReportPublic = LanguageReportDocument;
