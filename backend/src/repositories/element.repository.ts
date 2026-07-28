import { randomUUID } from 'node:crypto';

import type { Client } from '@elastic/elasticsearch';

import type { ChildrenPage, ElementDocument } from '../domain/element.js';
import { toElementPublic } from '../domain/element.js';
import { AppError } from '../domain/errors.js';
import { ELEMENTS_INDEX } from '../infra/elasticsearch.js';

export interface ListChildrenParams {
  projectId: string;
  parentPath: string;
  limit: number;
  offset: number;
}

export interface UpsertOptions {
  refresh?: boolean | 'wait_for';
  deduplicate?: boolean;
}

export class ElementRepository {
  constructor(private readonly client: Client) {}

  async refresh(): Promise<void> {
    await this.client.indices.refresh({ index: ELEMENTS_INDEX });
  }

  /** Load all active elements for a project (scroll) into a path→doc map. */
  async loadActiveByProject(projectId: string): Promise<Map<string, ElementDocument>> {
    return this.loadByProjectPathMap(projectId, { activeOnly: true });
  }

  /**
   * Path→element map for sync: includes inactive docs so re-sync reuses ids.
   * When multiple docs share a path, prefers active, then status_manually_set.
   */
  async loadByProjectPathMap(
    projectId: string,
    options: { activeOnly?: boolean } = {},
  ): Promise<Map<string, ElementDocument>> {
    const byPath = new Map<string, ElementDocument>();
    let searchAfter: Array<string | number> | undefined;
    const activeOnly = options.activeOnly === true;

    for (;;) {
      const result = await this.client.search<ElementDocument>({
        index: ELEMENTS_INDEX,
        size: 2000,
        sort: [{ path: 'asc' }, { id: 'asc' }],
        ...(searchAfter ? { search_after: searchAfter } : {}),
        query: {
          bool: {
            filter: [
              { term: { project_id: projectId } },
              ...(activeOnly ? [{ term: { is_active: true } }] : []),
            ],
          },
        },
      });

      const hits = result.hits.hits;
      if (hits.length === 0) {
        break;
      }

      for (const hit of hits) {
        if (!hit._source) {
          continue;
        }
        const doc: ElementDocument = {
          ...hit._source,
          id: hit._source.id || hit._id || '',
        };
        const previous = byPath.get(doc.path);
        if (!previous || preferElementForSyncMap(doc, previous) === doc) {
          byPath.set(doc.path, doc);
        }
      }

      const lastSort = hits[hits.length - 1]?.sort;
      if (!lastSort || hits.length < 2000) {
        break;
      }
      searchAfter = lastSort as Array<string | number>;
    }

    return byPath;
  }

  async bulkUpsert(
    elements: ElementDocument[],
    options: { refresh?: boolean } = {},
  ): Promise<void> {
    if (elements.length === 0) {
      return;
    }

    const chunkSize = 500;
    for (let offset = 0; offset < elements.length; offset += chunkSize) {
      const chunk = elements.slice(offset, offset + chunkSize);
      const isLast = offset + chunkSize >= elements.length;
      const operations = chunk.flatMap((doc) => [
        { index: { _index: ELEMENTS_INDEX, _id: doc.id } },
        doc,
      ]);
      const result = await this.client.bulk({
        operations,
        refresh: options.refresh && isLast ? 'wait_for' : false,
      });
      if (result.errors) {
        const first = result.items.find((item) => item.index?.error)?.index?.error;
        const detail = first
          ? `${first.type ?? 'error'}: ${first.reason ?? 'unknown'}`
          : 'unknown bulk error';
        throw new Error(`Element bulk upsert failed: ${detail}`);
      }
    }
  }

  async upsert(
    element: Omit<ElementDocument, 'id'> & { id?: string },
    options: UpsertOptions = {},
  ): Promise<ElementDocument> {
    const existing = await this.findByPath(element.project_id, element.path);
    const id = element.id || existing?.id || randomUUID();
    const doc: ElementDocument = {
      ...element,
      id,
    };

    await this.client.index({
      index: ELEMENTS_INDEX,
      id: doc.id,
      document: doc,
      refresh: options.refresh ?? 'wait_for',
    });

    if (options.deduplicate !== false) {
      await this.deactivatePathDuplicates(
        element.project_id,
        element.path,
        doc.id,
        options.refresh,
      );
    }

    return doc;
  }

  private async deactivatePathDuplicates(
    projectId: string,
    path: string,
    keepId: string,
    refresh: UpsertOptions['refresh'] = 'wait_for',
  ): Promise<void> {
    const result = await this.client.search<ElementDocument>({
      index: ELEMENTS_INDEX,
      size: 100,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { path } },
            { term: { is_active: true } },
          ],
        },
      },
    });

    for (const hit of result.hits.hits) {
      const duplicateId = hit._source?.id ?? hit._id;
      if (!duplicateId || duplicateId === keepId) {
        continue;
      }

      await this.client.update({
        index: ELEMENTS_INDEX,
        id: duplicateId,
        doc: { is_active: false },
        refresh,
      });
    }
  }

  async findByPath(projectId: string, path: string): Promise<ElementDocument | null> {
    const result = await this.client.search<ElementDocument>({
      index: ELEMENTS_INDEX,
      size: 10,
      sort: [
        { status_manually_set: { order: 'desc' } },
        { is_active: { order: 'desc' } },
      ],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { path } },
          ],
        },
      },
    });

    const hit = result.hits.hits[0];
    if (!hit?._source) {
      return null;
    }

    return {
      ...hit._source,
      id: hit._source.id || hit._id || '',
    };
  }

  async getById(id: string): Promise<ElementDocument | null> {
    try {
      const result = await this.client.get<ElementDocument>({
        index: ELEMENTS_INDEX,
        id,
      });
      if (!result._source) {
        return null;
      }
      return {
        ...result._source,
        id: result._source.id ?? result._id ?? id,
      };
    } catch (error: unknown) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async listChildren(params: ListChildrenParams): Promise<ChildrenPage> {
    const { projectId, parentPath, limit, offset } = params;

    const result = await this.client.search<ElementDocument>({
      index: ELEMENTS_INDEX,
      from: offset,
      size: limit,
      track_total_hits: true,
      sort: [
        { type: { order: 'asc' } },
        { path: { order: 'asc' } },
      ],
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { parent_path: parentPath } },
            { term: { is_active: true } },
          ],
        },
      },
    });

    const total =
      typeof result.hits.total === 'number'
        ? result.hits.total
        : (result.hits.total?.value ?? 0);

    const items = result.hits.hits
      .map((hit) => {
        const doc = hit._source;
        if (!doc) {
          return null;
        }
        return toElementPublic({
          ...doc,
          id: doc.id ?? hit._id ?? '',
        });
      })
      .filter((item): item is ReturnType<typeof toElementPublic> => item !== null);

    return { items, total, limit, offset };
  }

  async softDeleteExceptPaths(
    projectId: string,
    activePaths: Set<string>,
    refresh: UpsertOptions['refresh'] = 'wait_for',
    preloadedActive?: Map<string, ElementDocument>,
  ): Promise<number> {
    const active = preloadedActive ?? (await this.loadActiveByProject(projectId));
    const toDeactivate: string[] = [];
    for (const [path, doc] of active) {
      if (!activePaths.has(path) && doc.id && doc.is_active) {
        toDeactivate.push(doc.id);
      }
    }

    const chunkSize = 500;
    let deactivated = 0;
    for (let offset = 0; offset < toDeactivate.length; offset += chunkSize) {
      const chunk = toDeactivate.slice(offset, offset + chunkSize);
      const isLast = offset + chunkSize >= toDeactivate.length;
      const operations = chunk.flatMap((id) => [
        { update: { _index: ELEMENTS_INDEX, _id: id } },
        { doc: { is_active: false } },
      ]);
      const result = await this.client.bulk({
        operations,
        refresh: refresh && isLast ? 'wait_for' : false,
      });
      if (result.errors) {
        const first = result.items.find((item) => item.update?.error)?.update?.error;
        const detail = first
          ? `${first.type ?? 'error'}: ${first.reason ?? 'unknown'}`
          : 'unknown bulk error';
        throw new Error(`Element soft-delete bulk failed: ${detail}`);
      }
      deactivated += chunk.length;
    }

    return deactivated;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.client.deleteByQuery({
      index: ELEMENTS_INDEX,
      query: {
        term: { project_id: projectId },
      },
      refresh: true,
    });

    return result.deleted ?? 0;
  }

  async updateStatus(
    projectId: string,
    id: string,
    status: ElementDocument['status'],
  ): Promise<ElementDocument> {
    const existing = await this.getById(id);
    if (!existing || existing.project_id !== projectId) {
      throw new AppError('not_found', undefined, 404);
    }

    if (!existing.is_active) {
      throw new AppError('not_found', undefined, 404);
    }

    const updated: ElementDocument = {
      ...existing,
      status,
      status_manually_set: true,
    };

    await this.client.index({
      index: ELEMENTS_INDEX,
      id,
      document: updated,
      refresh: 'wait_for',
    });

    return updated;
  }

  /** Active descendants under folderPath (prefix `folderPath/`), excluding the folder itself. */
  async countActiveDescendants(projectId: string, folderPath: string): Promise<number> {
    const result = await this.client.count({
      index: ELEMENTS_INDEX,
      query: this.descendantsQuery(projectId, folderPath),
    });
    return result.count;
  }

  /**
   * Atomically set status + status_manually_set on folder and all active descendants.
   * Soft-limit is enforced by caller before invoke.
   */
  async updateStatusCascadeByPath(
    projectId: string,
    folderPath: string,
    status: ElementDocument['status'],
  ): Promise<number> {
    try {
      const result = await this.client.updateByQuery({
        index: ELEMENTS_INDEX,
        conflicts: 'abort',
        refresh: true,
        query: {
          bool: {
            filter: [
              { term: { project_id: projectId } },
              { term: { is_active: true } },
              {
                bool: {
                  should: [
                    { term: { path: folderPath } },
                    { prefix: { path: `${folderPath}/` } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
          },
        },
        script: {
          lang: 'painless',
          source:
            'ctx._source.status = params.status; ctx._source.status_manually_set = true;',
          params: { status },
        },
      });

      if ((result.failures?.length ?? 0) > 0) {
        throw new AppError('cascade_failed', undefined, 500);
      }

      return result.updated ?? 0;
    } catch (error: unknown) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('cascade_failed', undefined, 500);
    }
  }

  /**
   * Walk ancestor paths (nearest parent → root). Returns true if any active
   * ancestor has status not_needed and status_manually_set.
   */
  async hasManualNotNeededAncestor(projectId: string, elementPath: string): Promise<boolean> {
    for (const ancestorPath of ancestorPaths(elementPath)) {
      const ancestor = await this.findByPath(projectId, ancestorPath);
      if (
        ancestor?.is_active &&
        ancestor.status === 'not_needed' &&
        ancestor.status_manually_set
      ) {
        return true;
      }
    }
    return false;
  }

  private descendantsQuery(projectId: string, folderPath: string): Record<string, unknown> {
    return {
      bool: {
        filter: [
          { term: { project_id: projectId } },
          { term: { is_active: true } },
          { prefix: { path: `${folderPath}/` } },
        ],
      },
    };
  }
}

export function ancestorPaths(path: string): string[] {
  const parts = path.split('/').filter(Boolean);
  const result: string[] = [];
  for (let i = parts.length - 1; i >= 1; i -= 1) {
    result.push(parts.slice(0, i).join('/'));
  }
  return result;
}

/** Prefer active, then manually set, when collapsing duplicate path docs. */
export function preferElementForSyncMap(
  candidate: ElementDocument,
  current: ElementDocument,
): ElementDocument {
  if (candidate.is_active !== current.is_active) {
    return candidate.is_active ? candidate : current;
  }
  if (candidate.status_manually_set !== current.status_manually_set) {
    return candidate.status_manually_set ? candidate : current;
  }
  return current;
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
