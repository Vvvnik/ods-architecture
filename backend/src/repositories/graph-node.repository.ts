import type { Client } from '@elastic/elasticsearch';

import type { GraphNodeDocument } from '../domain/graph-node.js';
import { GRAPH_NODES_INDEX } from '../infra/elasticsearch.js';

export class GraphNodeRepository {
  constructor(private readonly client: Client) {}

  async bulkUpsert(nodes: GraphNodeDocument[]): Promise<void> {
    if (nodes.length === 0) {
      return;
    }

    const operations = nodes.flatMap((node) => [
      { index: { _index: GRAPH_NODES_INDEX, _id: `${node.analysis_run_id}:${node.id}` } },
      node,
    ]);

    const result = await this.client.bulk({ operations, refresh: 'wait_for' });
    if (result.errors) {
      throw new Error('Ошибка bulk upsert узлов графа');
    }
  }

  async listByProjectAndRun(
    projectId: string,
    analysisRunId: string,
    options: { path?: string; kind?: string; limit?: number; offset?: number } = {},
  ): Promise<{ items: GraphNodeDocument[]; total: number }> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const filters: Array<Record<string, unknown>> = [
      { term: { project_id: projectId } },
      { term: { analysis_run_id: analysisRunId } },
    ];

    if (options.path) {
      filters.push({ term: { path: options.path } });
    }
    if (options.kind) {
      filters.push({ term: { kind: options.kind } });
    }

    const result = await this.client.search<GraphNodeDocument>({
      index: GRAPH_NODES_INDEX,
      from: offset,
      size: limit,
      sort: [{ path: { order: 'asc' } }, { name: { order: 'asc' } }],
      track_total_hits: true,
      query: { bool: { filter: filters } },
    });

    const items = result.hits.hits
      .map((hit) => hit._source)
      .filter((doc): doc is GraphNodeDocument => doc !== undefined);

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total?.value ?? items.length);

    return { items, total };
  }

  async countByProjectAndRun(projectId: string, analysisRunId: string): Promise<number> {
    const result = await this.client.count({
      index: GRAPH_NODES_INDEX,
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

  async getByLogicalId(
    projectId: string,
    analysisRunId: string,
    nodeId: string,
  ): Promise<GraphNodeDocument | null> {
    const result = await this.client.search<GraphNodeDocument>({
      index: GRAPH_NODES_INDEX,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
            { term: { id: nodeId } },
          ],
        },
      },
    });

    const hit = result.hits.hits[0];
    return hit?._source ?? null;
  }

  async listDistinctLanguages(projectId: string, analysisRunId: string): Promise<string[]> {
    const result = await this.client.search({
      index: GRAPH_NODES_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
        },
      },
      aggs: {
        languages: {
          terms: { field: 'language', size: 50, order: { _key: 'asc' } },
        },
      },
    });

    const buckets = (
      result.aggregations?.languages as { buckets?: Array<{ key: string }> } | undefined
    )?.buckets;

    return buckets?.map((bucket) => bucket.key) ?? [];
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
      index: GRAPH_NODES_INDEX,
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
    let offset = 0;
    let copied = 0;
    const ingestedAt = new Date().toISOString();

    while (true) {
      const { items, total } = await this.listByProjectAndRun(projectId, sourceRunId, {
        limit: pageSize,
        offset,
      });

      if (items.length === 0) {
        break;
      }

      const nodes = items.map((node) => ({
        ...node,
        analysis_run_id: targetRunId,
        ingested_at: ingestedAt,
      }));

      await this.bulkUpsert(nodes);
      copied += nodes.length;
      offset += items.length;

      if (offset >= total) {
        break;
      }
    }

    return copied;
  }

  async deleteByProjectId(projectId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: GRAPH_NODES_INDEX,
      refresh: true,
      query: { term: { project_id: projectId } },
    });
  }
}
