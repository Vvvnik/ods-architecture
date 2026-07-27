import type { Client } from '@elastic/elasticsearch';

import type { GraphNodeDocument } from '../domain/graph-node.js';
import { GRAPH_NODES_INDEX } from '../infra/elasticsearch.js';

export class GraphNodeRepository {
  constructor(private readonly client: Client) {}

  /** Keep each bulk under ES coordinating circuit-breaker (heap-dependent). */
  private static readonly BULK_CHUNK_SIZE = 200;

  async bulkUpsert(nodes: GraphNodeDocument[]): Promise<void> {
    if (nodes.length === 0) {
      return;
    }

    const chunkSize = GraphNodeRepository.BULK_CHUNK_SIZE;
    for (let offset = 0; offset < nodes.length; offset += chunkSize) {
      const chunk = nodes.slice(offset, offset + chunkSize);
      const isLast = offset + chunkSize >= nodes.length;
      await this.bulkUpsertChunk(chunk, isLast);
    }
  }

  private async bulkUpsertChunk(nodes: GraphNodeDocument[], refresh: boolean): Promise<void> {
    const docIds = nodes.map((node) => `${node.analysis_run_id}:${node.id}`);
    const existing = await this.client.mget({
      index: GRAPH_NODES_INDEX,
      ids: docIds,
    });
    const previousById = new Map<string, GraphNodeDocument>();
    for (const doc of existing.docs) {
      if ('error' in doc) {
        continue;
      }
      const found = doc as { found?: boolean; _id?: string; _source?: GraphNodeDocument };
      if (found.found && found._source && found._id) {
        previousById.set(found._id, found._source);
      }
    }

    const mergedNodes = nodes.map((node) => {
      const key = `${node.analysis_run_id}:${node.id}`;
      const previous = previousById.get(key);
      if (!previous) {
        return node;
      }
      return {
        ...previous,
        ...node,
        metadata: {
          ...(previous.metadata ?? {}),
          ...(node.metadata ?? {}),
        },
      };
    });

    const operations = mergedNodes.flatMap((node) => [
      { index: { _index: GRAPH_NODES_INDEX, _id: `${node.analysis_run_id}:${node.id}` } },
      node,
    ]);

    const result = await this.client.bulk({
      operations,
      refresh: refresh ? 'wait_for' : false,
    });
    if (result.errors) {
      const first = result.items.find((item) => item.index?.error)?.index?.error;
      const detail = first
        ? `${first.type ?? 'error'}: ${first.reason ?? 'unknown'}`
        : 'unknown bulk error';
      throw new Error(`Graph node bulk upsert failed: ${detail}`);
    }
  }

  async listByProjectAndRun(
    projectId: string,
    analysisRunId: string,
    options: {
      path?: string;
      kind?: string;
      parentId?: string | null | 'root';
      limit?: number;
      offset?: number;
    } = {},
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
    if (options.parentId !== undefined) {
      if (options.parentId === null || options.parentId === 'root' || options.parentId === '') {
        filters.push({
          bool: {
            should: [
              { bool: { must_not: { exists: { field: 'parent_id' } } } },
              { term: { parent_id: '' } },
            ],
            minimum_should_match: 1,
          },
        });
      } else {
        filters.push({ term: { parent_id: options.parentId } });
      }
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

  async search(
    projectId: string,
    analysisRunId: string,
    q: string,
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ items: GraphNodeDocument[]; total: number }> {
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const wildcard = `*${escapeWildcard(q)}*`;

    const result = await this.client.search<GraphNodeDocument>({
      index: GRAPH_NODES_INDEX,
      from: offset,
      size: limit,
      track_total_hits: true,
      sort: [{ name: { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
          ],
          should: [
            { wildcard: { name: { value: wildcard, case_insensitive: true } } },
            { wildcard: { path: { value: wildcard, case_insensitive: true } } },
            { wildcard: { kind: { value: wildcard, case_insensitive: true } } },
            { wildcard: { qualified_name: { value: wildcard, case_insensitive: true } } },
          ],
          minimum_should_match: 1,
        },
      },
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

  async hasChildrenMap(
    projectId: string,
    analysisRunId: string,
    parentIds: string[],
  ): Promise<Map<string, boolean>> {
    const map = new Map<string, boolean>();
    if (parentIds.length === 0) {
      return map;
    }

    const result = await this.client.search({
      index: GRAPH_NODES_INDEX,
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
            { terms: { parent_id: parentIds } },
          ],
        },
      },
      aggs: {
        by_parent: {
          terms: { field: 'parent_id', size: parentIds.length },
        },
      },
    });

    const buckets = (
      result.aggregations?.by_parent as { buckets?: Array<{ key: string; doc_count: number }> }
    )?.buckets;

    for (const id of parentIds) {
      map.set(id, false);
    }
    for (const bucket of buckets ?? []) {
      map.set(bucket.key, bucket.doc_count > 0);
    }
    return map;
  }

  async listLogicalIdsByProjectAndRun(projectId: string, analysisRunId: string): Promise<Set<string>> {
    const ids = new Set<string>();
    const pageSize = 1000;
    let searchAfter: Array<string | number> | undefined;

    // Use search_after — from+size breaks above ES max_result_window (10_000).
    for (;;) {
      const result = await this.client.search<{ id: string }>({
        index: GRAPH_NODES_INDEX,
        size: pageSize,
        _source: ['id'],
        track_total_hits: false,
        // Sort only on keyword `id` — `_id` fielddata is disabled in modern ES.
        // Within project+run, logical id is unique (doc _id = run:id).
        sort: [{ id: { order: 'asc' } }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: {
          bool: {
            filter: [
              { term: { project_id: projectId } },
              { term: { analysis_run_id: analysisRunId } },
            ],
          },
        },
      });

      const hits = result.hits.hits;
      if (hits.length === 0) {
        break;
      }

      for (const hit of hits) {
        const id = hit._source?.id;
        if (id) {
          ids.add(id);
        }
      }

      const lastSort = hits[hits.length - 1]?.sort;
      if (!lastSort || hits.length < pageSize) {
        break;
      }
      searchAfter = lastSort as Array<string | number>;
    }

    return ids;
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

  async listByKinds(
    projectId: string,
    analysisRunId: string,
    kinds: string[],
    options: { limit?: number; offset?: number } = {},
  ): Promise<{ items: GraphNodeDocument[]; total: number }> {
    if (kinds.length === 0) {
      return { items: [], total: 0 };
    }
    const limit = options.limit ?? 500;
    const offset = options.offset ?? 0;
    const result = await this.client.search<GraphNodeDocument>({
      index: GRAPH_NODES_INDEX,
      from: offset,
      size: limit,
      track_total_hits: true,
      sort: [{ kind: { order: 'asc' } }, { name: { order: 'asc' } }],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { analysis_run_id: analysisRunId } },
            { terms: { kind: kinds } },
          ],
        },
      },
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

  /**
   * Strategy (A) for 012: load code-ish nodes whose path contains a segment
   * matching `segment` (e.g. service name `backend` → `*backend*`).
   */
  async listByPathSegment(
    projectId: string,
    analysisRunId: string,
    segment: string,
    options: { limit?: number; kinds?: string[] } = {},
  ): Promise<{ items: GraphNodeDocument[]; total: number }> {
    const trimmed = segment.trim();
    if (!trimmed) {
      return { items: [], total: 0 };
    }
    const limit = options.limit ?? 2000;
    const wildcard = `*${trimmed.replace(/[*?]/g, '')}*`;
    const filters: object[] = [
      { term: { project_id: projectId } },
      { term: { analysis_run_id: analysisRunId } },
      { wildcard: { path: { value: wildcard, case_insensitive: true } } },
    ];
    if (options.kinds && options.kinds.length > 0) {
      filters.push({ terms: { kind: options.kinds } });
    }
    const result = await this.client.search<GraphNodeDocument>({
      index: GRAPH_NODES_INDEX,
      from: 0,
      size: limit,
      track_total_hits: true,
      sort: [{ path: { order: 'asc' } }, { name: { order: 'asc' } }],
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
    let copied = 0;
    const ingestedAt = new Date().toISOString();
    let searchAfter: Array<string | number> | undefined;

    for (;;) {
      const result = await this.client.search<GraphNodeDocument>({
        index: GRAPH_NODES_INDEX,
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
        .filter((doc): doc is GraphNodeDocument => doc !== undefined);

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
      index: GRAPH_NODES_INDEX,
      refresh: true,
      query: { term: { project_id: projectId } },
    });
  }

  async deleteByProjectExceptRun(projectId: string, keepRunId: string): Promise<void> {
    await this.client.deleteByQuery({
      index: GRAPH_NODES_INDEX,
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
