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
}

export interface LanguageReportDocument {
  id: string;
  project_id: string;
  detected_at: string;
  sync_id?: string | null;
  languages: LanguageEntry[];
  artifacts: ArtifactEntry[];
}

export type LanguageReportPublic = LanguageReportDocument;
