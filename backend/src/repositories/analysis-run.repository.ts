import { randomUUID } from 'node:crypto';

import type { Client } from '@elastic/elasticsearch';

import { AppError } from '../domain/errors.js';
import type { AnalysisRunDocument } from '../domain/analysis-run.js';
import { ANALYSIS_RUNS_INDEX } from '../infra/elasticsearch.js';

export class AnalysisRunRepository {
  constructor(private readonly client: Client) {}

  async create(run: Omit<AnalysisRunDocument, 'id'> & { id?: string }): Promise<AnalysisRunDocument> {
    const doc: AnalysisRunDocument = {
      id: run.id ?? randomUUID(),
      ...run,
    };

    await this.client.index({
      index: ANALYSIS_RUNS_INDEX,
      id: doc.id,
      document: doc,
      refresh: 'wait_for',
    });

    return doc;
  }

  async update(id: string, patch: Partial<AnalysisRunDocument>): Promise<AnalysisRunDocument> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new AppError('analysis_run_not_found', undefined, 404);
    }

    const updated: AnalysisRunDocument = { ...existing, ...patch, id: existing.id };

    await this.client.index({
      index: ANALYSIS_RUNS_INDEX,
      id,
      document: updated,
      refresh: 'wait_for',
    });

    return updated;
  }

  async getById(id: string): Promise<AnalysisRunDocument | null> {
    try {
      const result = await this.client.get<AnalysisRunDocument>({
        index: ANALYSIS_RUNS_INDEX,
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

  async listByProjectId(projectId: string, limit = 20): Promise<AnalysisRunDocument[]> {
    const result = await this.client.search<AnalysisRunDocument>({
      index: ANALYSIS_RUNS_INDEX,
      size: limit,
      sort: [{ started_at: { order: 'desc' } }],
      query: {
        term: { project_id: projectId },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is AnalysisRunDocument => doc !== undefined);
  }

  async findRunningByProjectId(projectId: string): Promise<AnalysisRunDocument | null> {
    const result = await this.client.search<AnalysisRunDocument>({
      index: ANALYSIS_RUNS_INDEX,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { terms: { status: ['pending', 'running'] } },
          ],
        },
      },
    });

    const hit = result.hits.hits[0];
    return hit?._source ?? null;
  }

  async patchIngestMetadata(
    id: string,
    patch: {
      ingest_status?: string | null;
      ingest_completed_at?: string | null;
      ingest_errors?: Array<{ parser_id: string; message: string }>;
    },
  ): Promise<AnalysisRunDocument> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new AppError('analysis_run_not_found', undefined, 404);
    }

    const updated: AnalysisRunDocument = {
      ...existing,
      ...patch,
      id: existing.id,
    };

    await this.client.index({
      index: ANALYSIS_RUNS_INDEX,
      id,
      document: updated,
      refresh: 'wait_for',
    });

    return updated;
  }

  async recoverInterruptedRuns(): Promise<number> {
    const result = await this.client.search<AnalysisRunDocument>({
      index: ANALYSIS_RUNS_INDEX,
      size: 100,
      query: {
        terms: { status: ['pending', 'running'] },
      },
    });

    let recovered = 0;
    for (const hit of result.hits.hits) {
      const doc = hit._source;
      if (!doc) {
        continue;
      }

      await this.update(doc.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        last_error_message: 'Analysis was interrupted by a service restart',
      });
      recovered += 1;
    }

    return recovered;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: ANALYSIS_RUNS_INDEX,
      refresh: true,
      query: { term: { project_id: projectId } },
    });
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
