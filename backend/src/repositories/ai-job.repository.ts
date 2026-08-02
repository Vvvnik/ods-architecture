import { randomUUID } from 'node:crypto';

import type { Client } from '@elastic/elasticsearch';

import type { AiJobDocument, AiJobKind } from '../domain/ai-job.js';
import { AI_JOBS_INDEX } from '../infra/elasticsearch.js';

export class AiJobRepository {
  constructor(private readonly client: Client) {}

  async create(job: Omit<AiJobDocument, 'id'> & { id?: string }): Promise<AiJobDocument> {
    const document: AiJobDocument = { id: job.id ?? randomUUID(), ...job };
    await this.client.index({
      index: AI_JOBS_INDEX,
      id: document.id,
      document,
      refresh: 'wait_for',
    });
    return document;
  }

  async getById(id: string): Promise<AiJobDocument | null> {
    try {
      const result = await this.client.get<AiJobDocument>({ index: AI_JOBS_INDEX, id });
      return result._source ?? null;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async update(id: string, patch: Partial<AiJobDocument>): Promise<AiJobDocument> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`AI job ${id} not found`);
    }
    const document: AiJobDocument = { ...existing, ...patch, id: existing.id };
    await this.client.index({
      index: AI_JOBS_INDEX,
      id,
      document,
      refresh: 'wait_for',
    });
    return document;
  }

  async findRunning(projectId: string, kind: AiJobKind): Promise<AiJobDocument | null> {
    return this.findOne(projectId, kind, ['running']);
  }

  async getCurrent(projectId: string, kind: AiJobKind): Promise<AiJobDocument | null> {
    const running = await this.findRunning(projectId, kind);
    return running ?? this.findOne(projectId, kind, ['succeeded', 'failed']);
  }

  async hasSucceeded(projectId: string, kind: AiJobKind): Promise<boolean> {
    return (await this.findOne(projectId, kind, ['succeeded'])) !== null;
  }

  /**
   * Mark running AiJobs whose analysis_run_id is in the given set as failed
   * (used after AnalysisRun restart recovery).
   */
  async failRunningForAnalysisRuns(
    analysisRunIds: string[],
    message: string,
  ): Promise<number> {
    if (analysisRunIds.length === 0) return 0;
    const result = await this.client.search<AiJobDocument>({
      index: AI_JOBS_INDEX,
      size: 100,
      query: {
        bool: {
          filter: [
            { term: { status: 'running' } },
            { terms: { analysis_run_id: analysisRunIds } },
          ],
        },
      },
    });
    const now = new Date().toISOString();
    let failed = 0;
    for (const hit of result.hits.hits) {
      const doc = hit._source;
      if (!doc) continue;
      await this.update(doc.id, {
        status: 'failed',
        summary: message,
        provenance: { ...doc.provenance, finished_at: now },
        updated_at: now,
      });
      failed += 1;
    }
    return failed;
  }

  private async findOne(
    projectId: string,
    kind: AiJobKind,
    statuses: AiJobDocument['status'][],
  ): Promise<AiJobDocument | null> {
    const result = await this.client.search<AiJobDocument>({
      index: AI_JOBS_INDEX,
      size: 1,
      sort: [{ updated_at: { order: 'desc' } }, { created_at: { order: 'desc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { kind } },
            { terms: { status: statuses } },
          ],
        },
      },
    });
    return result.hits.hits[0]?._source ?? null;
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'meta' in error &&
    (error as { meta?: { statusCode?: number } }).meta?.statusCode === 404
  );
}
