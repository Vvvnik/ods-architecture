import { randomUUID } from 'node:crypto';

import type { Client } from '@elastic/elasticsearch';

import type { ParserEnvelopeDocument } from '../domain/parser-envelope.js';
import { PARSER_ENVELOPES_INDEX } from '../infra/elasticsearch.js';

export class ParserEnvelopeRepository {
  constructor(private readonly client: Client) {}

  async save(
    envelope: Omit<ParserEnvelopeDocument, 'id' | 'stored_at'> & {
      id?: string;
      stored_at?: string;
    },
  ): Promise<ParserEnvelopeDocument> {
    const doc: ParserEnvelopeDocument = {
      id: envelope.id ?? randomUUID(),
      stored_at: envelope.stored_at ?? new Date().toISOString(),
      ...envelope,
    };

    await this.client.index({
      index: PARSER_ENVELOPES_INDEX,
      id: doc.id,
      document: doc,
      refresh: 'wait_for',
    });

    return doc;
  }

  async getById(id: string): Promise<ParserEnvelopeDocument | null> {
    try {
      const result = await this.client.get<ParserEnvelopeDocument>({
        index: PARSER_ENVELOPES_INDEX,
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

  async listByRunId(analysisRunId: string): Promise<ParserEnvelopeDocument[]> {
    const result = await this.client.search<ParserEnvelopeDocument>({
      index: PARSER_ENVELOPES_INDEX,
      size: 100,
      sort: [{ parser_id: { order: 'asc' } }],
      query: {
        term: { analysis_run_id: analysisRunId },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is ParserEnvelopeDocument => doc !== undefined);
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: PARSER_ENVELOPES_INDEX,
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
