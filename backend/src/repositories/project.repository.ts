import { randomUUID } from 'node:crypto';

import type { Client } from '@elastic/elasticsearch';

import { AppError } from '../domain/errors.js';
import type { ProjectDocument } from '../domain/project.js';
import { ELEMENTS_INDEX, PROJECTS_INDEX } from '../infra/elasticsearch.js';

export class ProjectRepository {
  constructor(private readonly client: Client) {}

  async create(project: Omit<ProjectDocument, 'id'> & { id?: string }): Promise<ProjectDocument> {
    const doc: ProjectDocument = {
      id: project.id ?? randomUUID(),
      ...project,
    };

    await this.client.index({
      index: PROJECTS_INDEX,
      id: doc.id,
      document: doc,
      refresh: 'wait_for',
    });

    return doc;
  }

  async getById(id: string): Promise<ProjectDocument | null> {
    try {
      const result = await this.client.get<ProjectDocument>({
        index: PROJECTS_INDEX,
        id,
      });
      return result._source ?? null;
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async findBySource(sourceType: string, sourceValue: string): Promise<ProjectDocument | null> {
    const result = await this.client.search<ProjectDocument>({
      index: PROJECTS_INDEX,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { source_type: sourceType } },
            { term: { source_value: sourceValue } },
          ],
        },
      },
    });

    const hit = result.hits.hits[0];
    return hit?._source ?? null;
  }

  async list(): Promise<ProjectDocument[]> {
    const result = await this.client.search<ProjectDocument>({
      index: PROJECTS_INDEX,
      size: 1000,
      sort: [{ last_sync_at: { order: 'desc', missing: '_last' } }],
      query: { match_all: {} },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is ProjectDocument => doc !== undefined);
  }

  async update(id: string, patch: Partial<ProjectDocument>): Promise<ProjectDocument> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new AppError('not_found', undefined, 404);
    }

    const updated: ProjectDocument = { ...existing, ...patch, id: existing.id };

    await this.client.index({
      index: PROJECTS_INDEX,
      id,
      document: updated,
      refresh: 'wait_for',
    });

    return updated;
  }

  async findBySyncStatus(syncStatus: ProjectDocument['sync_status']): Promise<ProjectDocument[]> {
    const result = await this.client.search<ProjectDocument>({
      index: PROJECTS_INDEX,
      size: 1000,
      query: {
        term: { sync_status: syncStatus },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is ProjectDocument => doc !== undefined);
  }

  async recoverInterruptedSyncs(): Promise<number> {
    const running = await this.findBySyncStatus('running');
    let recovered = 0;

    for (const project of running) {
      await this.update(project.id, {
        sync_status: 'failed',
        last_error_message: 'Синхронизация прервана при перезапуске сервиса',
      });
      recovered += 1;
    }

    return recovered;
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
