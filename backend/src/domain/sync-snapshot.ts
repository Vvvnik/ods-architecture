export interface SnapshotFile {
  path: string;
  mtime_ms: number;
  size: number;
}

export interface SyncSnapshotDocument {
  project_id: string;
  captured_at: string;
  files: SnapshotFile[];
}
