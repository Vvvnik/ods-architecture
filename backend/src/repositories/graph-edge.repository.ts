import type { Client } from '@elastic/elasticsearch';

import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import { GRAPH_EDGES_INDEX } from '../infra/elasticsearch.js';

export class GraphEdgeRepository {
  constructor(private readonly client: Client) {}

  private static readonly BULK_CHUNK_SIZE = 500;

  async bulkUpsert(edges: GraphEdgeDocument[]): Promise<void> {
    if (edges.length === 0) {
      return;
    }

    const chunkSize = GraphEdgeRepository.BULK_CHUNK_SIZE;
    for (let offset = 0; offset < edges.length; offset += chunkSize) {
      const chunk = edges.slice(offset, offset + chunkSize);
      const isLast = offset + chunkSize >= edges.length;
      const operations = chunk.flatMap((edge) => [
        { index: { _index: GRAPH_EDGES_INDEX, _id: `${edge.analysis_run_id}:${edge.id}` } },
        edge,
      ]);

      const result = await this.client.bulk({
        operations,
        refresh: isLast ? 'wait_for' : false,
      });
      if (result.errors) {
        const first = result.items.find((item) => item.index?.error)?.index?.error;
        const detail = first
          ? `${first.type ?? 'error'}: ${first.reason ?? 'unknown'}`
          : 'unknown bulk error';
        throw new Error(`Graph edge bulk upsert failed: ${detail}`);
      }
    }
  }

  async listByNode(
    projectId: string,
    analysisRunId: string,
    nodeId: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both',
    limit = 50,
  ): Promise<GraphEdgeDocument[]> {
    const should: Array<Record<string, unknown>> = [];
    if (direction === 'outgoing' || direction === 'both') {
      should.push({ term: { from: nodeId } });
    }
    if (direction === 'incoming' || direction === 'both') {
      should.push({ term: { to: nodeId } });
    }

    const result = await this.client.search<GraphEdgeDocument>({
      index: GRAPH_EDGES_INDEX,
      size: limit,
      sort: [{ type: { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
          should,
          minimum_should_match: 1,
        },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is GraphEdgeDocument => doc !== undefined);
  }

  async listForFile(
    projectId: string,
    analysisRunId: string,
    path: string,
    nodeIds: string[],
    limit = 50,
  ): Promise<GraphEdgeDocument[]> {
    const should: Array<Record<string, unknown>> = [{ term: { path } }];
    if (nodeIds.length > 0) {
      should.push({ terms: { from: nodeIds } });
      should.push({ terms: { to: nodeIds } });
    }

    const result = await this.client.search<GraphEdgeDocument>({
      index: GRAPH_EDGES_INDEX,
      size: limit,
      sort: [{ type: { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
          should,
          minimum_should_match: 1,
        },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is GraphEdgeDocument => doc !== undefined);
  }

  async listIncidentToNodes(
    projectId: string,
    analysisRunId: string,
    nodeIds: string[],
    limit = 1000,
  ): Promise<GraphEdgeDocument[]> {
    if (nodeIds.length === 0) {
      return [];
    }
    const result = await this.client.search<GraphEdgeDocument>({
      index: GRAPH_EDGES_INDEX,
      size: limit,
      sort: [{ type: { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
          should: [{ terms: { from: nodeIds } }, { terms: { to: nodeIds } }],
          minimum_should_match: 1,
        },
      },
    });

    return result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is GraphEdgeDocument => doc !== undefined);
  }

  async countByProjectAndRun(projectId: string, analysisRunId: string): Promise<number> {
    const result = await this.client.count({
      index: GRAPH_EDGES_INDEX,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
        },
      },
    });
    return result.count;
  }

  async search(
    projectId: string,
    analysisRunId: string,
    q: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ items: GraphEdgeDocument[]; total: number }> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const wildcard = `*${escapeWildcard(q)}*`;

    const result = await this.client.search<GraphEdgeDocument>({
      index: GRAPH_EDGES_INDEX,
      from: offset,
      size: limit,
      track_total_hits: true,
      sort: [{ type: { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
          should: [
            { wildcard: { type: { value: wildcard, case_insensitive: true } } },
            { wildcard: { from: { value: wildcard, case_insensitive: true } } },
            { wildcard: { to: { value: wildcard, case_insensitive: true } } },
            { wildcard: { path: { value: wildcard, case_insensitive: true } } },
          ],
          minimum_should_match: 1,
        },
      },
    });

    const items = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is GraphEdgeDocument => doc !== undefined);

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total?.value ?? items.length);

    return { items, total };
  }

  async deleteByPaths(params: {
    projectId: string;
    analysisRunId: string;
    parserId: string;
    paths: string[];
  }): Promise<void> {
    if (params.paths.length === 0) {
      return;
    }

    await this.client.deleteByQuery({
      index: GRAPH_EDGES_INDEX,
      refresh: true,
      query: {
        bool: {
          filter: [
            { term: { project_id: params.projectId } },
            { term: { analysis_run_id: params.analysisRunId } },
            { term: { parser_id: params.parserId } },
            { terms: { path: params.paths } },
          ],
        },
      },
    });
  }

  /** Alias for deleteByPaths — kept for existing call sites. */
  async deleteByQuery(params: {
    projectId: string;
    analysisRunId: string;
    parserId: string;
    paths: string[];
  }): Promise<void> {
    await this.deleteByPaths(params);
  }

  async copyFromRun(
    projectId: string,
    sourceRunId: string,
    targetRunId: string,
  ): Promise<number> {
    const pageSize = 200;
    let copied = 0;
    const ingestedAt = new Date().toISOString();
    let searchAfter: Array<string | number> | undefined;

    for (;;) {
      const result = await this.client.search<GraphEdgeDocument>({
        index: GRAPH_EDGES_INDEX,
        size: pageSize,
        track_total_hits: false,
        sort: [{ id: { order: 'asc' } }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: {
          bool: {
            filter: [
              { term: { project_id: projectId } },
              { term: { analysis_run_id: sourceRunId } },
            ],
          },
        },
      });

      const items = result.hits.hits
        .map((hit) => hit._source)
        .filter((doc): doc is GraphEdgeDocument => doc !== undefined);

      if (items.length === 0) {
        break;
      }

      const edges = items.map((edge) => ({
        ...edge,
        analysis_run_id: targetRunId,
        ingested_at: ingestedAt,
      }));

      await this.bulkUpsert(edges);
      copied += edges.length;

      const lastSort = result.hits.hits[result.hits.hits.length - 1]?.sort;
      if (!lastSort || items.length < pageSize) {
        break;
      }
      searchAfter = lastSort as Array<string | number>;
    }

    return copied;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: GRAPH_EDGES_INDEX,
      refresh: true,
      query: { term: { project_id: projectId } },
    });
  }

  async deleteByProjectExceptRun(projectId: string, keepRunId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: GRAPH_EDGES_INDEX,
      refresh: true,
      query: {
        bool: {
          filter: [{ term: { project_id: projectId } }],
          must_not: [{ term: { analysis_run_id: keepRunId } }],
        },
      },
    });
  }
}

function escapeWildcard(value: string): string {
  return value.replace(/[\\*?]/g, '\\$&');
}
