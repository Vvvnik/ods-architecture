import type { Client } from '@elastic/elasticsearch';

import type { SyncSnapshotDocument } from '../domain/sync-snapshot.js';
import { SYNC_SNAPSHOTS_INDEX } from '../infra/elasticsearch.js';

export class SyncSnapshotRepository {
  constructor(private readonly client: Client) {}

  async upsert(snapshot: SyncSnapshotDocument): Promise<SyncSnapshotDocument> {
    await this.client.index({
      index: SYNC_SNAPSHOTS_INDEX,
      id: snapshot.project_id,
      document: snapshot,
      refresh: 'wait_for',
    });

    return snapshot;
  }

  async getByProjectId(projectId: string): Promise<SyncSnapshotDocument | null> {
    try {
      const result = await this.client.get<SyncSnapshotDocument>({
        index: SYNC_SNAPSHOTS_INDEX,
        id: projectId,
      });
      return result._source ?? null;
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    try {
      await this.client.delete({
        index: SYNC_SNAPSHOTS_INDEX,
        id: projectId,
        refresh: true,
      });
    } catch (error: unknown) {
      if (!isNotFound(error)) {
        throw error;
      }
    }
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: number } }).meta?.statusCode === 'number' &&
    (error as { meta: { statusCode: number } }).meta.statusCode === 404
  );
}
