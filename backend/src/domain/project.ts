export const SYNC_STATUSES = [
  'idle',
  'running',
  'success',
  'failed',
  'partial',
] as const;

export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const SOURCE_TYPES = ['git_url', 'local_path'] as const;

export type SourceType = (typeof SOURCE_TYPES)[number];

export interface ProjectDocument {
  id: string;
  name: string;
  source_type: SourceType;
  source_value: string;
  working_copy_root: string;
  created_at: string;
  last_sync_at: string | null;
  sync_status: SyncStatus;
  last_error_message: string | null;
}

export interface ProjectPublic {
  id: string;
  name: string;
  source_type: SourceType;
  source_value: string;
  sync_status: SyncStatus;
  last_sync_at: string | null;
  last_error_message: string | null;
}

export function toProjectPublic(doc: ProjectDocument): ProjectPublic {
  return {
    id: doc.id,
    name: doc.name,
    source_type: doc.source_type,
    source_value: doc.source_value,
    sync_status: doc.sync_status,
    last_sync_at: doc.last_sync_at,
    last_error_message: doc.last_error_message,
  };
}
