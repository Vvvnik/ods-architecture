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
  ): Promise<number> {
    const result = await this.client.search<ElementDocument>({
      index: ELEMENTS_INDEX,
      size: 10000,
      query: {
        bool: {
          filter: [
            { term: { project_id: projectId } },
            { term: { is_active: true } },
          ],
        },
      },
    });

    let deactivated = 0;

    for (const hit of result.hits.hits) {
      const doc = hit._source;
      if (!doc || activePaths.has(doc.path)) {
        continue;
      }

      const docId = doc.id || hit._id;
      if (!docId) {
        continue;
      }

      await this.client.update({
        index: ELEMENTS_INDEX,
        id: docId,
        doc: { is_active: false },
        refresh,
      });
      deactivated += 1;
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

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'meta' in error &&
    typeof (error as { meta?: { statusCode?: number } }).meta?.statusCode === 'number' &&
    (error as { meta: { statusCode: number } }).meta.statusCode === 404
  );
}
