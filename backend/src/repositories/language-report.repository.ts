import { randomUUID } from 'node:crypto';

import type { Client } from '@elastic/elasticsearch';

import type { LanguageReportDocument } from '../domain/language-report.js';
import { LANGUAGE_REPORTS_INDEX } from '../infra/elasticsearch.js';

export class LanguageReportRepository {
  constructor(private readonly client: Client) {}

  async save(report: Omit<LanguageReportDocument, 'id'> & { id?: string }): Promise<LanguageReportDocument> {
    const doc: LanguageReportDocument = {
      id: report.id ?? randomUUID(),
      ...report,
    };

    await this.client.index({
      index: LANGUAGE_REPORTS_INDEX,
      id: doc.id,
      document: doc,
      refresh: 'wait_for',
    });

    return doc;
  }

  async getById(id: string): Promise<LanguageReportDocument | null> {
    try {
      const result = await this.client.get<LanguageReportDocument>({
        index: LANGUAGE_REPORTS_INDEX,
        id,
      });
      return result._source ? normalizeLanguageReport(result._source) : null;
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async getLatestByProjectId(projectId: string): Promise<LanguageReportDocument | null> {
    const result = await this.client.search<LanguageReportDocument>({
      index: LANGUAGE_REPORTS_INDEX,
      size: 1,
      sort: [{ detected_at: { order: 'desc' } }],
      query: {
        term: { project_id: projectId },
      },
    });

    const hit = result.hits.hits[0];
    const doc = hit?._source ?? null;
    return doc ? normalizeLanguageReport(doc) : null;
  }

  async listByProjectId(projectId: string, limit = 20): Promise<LanguageReportDocument[]> {
    const result = await this.client.search<LanguageReportDocument>({
      index: LANGUAGE_REPORTS_INDEX,
      size: limit,
      sort: [{ detected_at: { order: 'desc' } }],
      query: {
        term: { project_id: projectId },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is LanguageReportDocument => doc !== undefined)
      .map(normalizeLanguageReport);
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: LANGUAGE_REPORTS_INDEX,
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

function normalizeLanguageReport(doc: LanguageReportDocument): LanguageReportDocument {
  return {
    ...doc,
    artifacts: doc.artifacts ?? [],
    frontend_languages: doc.frontend_languages ?? undefined,
  };
}
