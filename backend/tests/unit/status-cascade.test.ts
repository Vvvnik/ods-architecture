import { describe, expect, it, vi } from 'vitest';

import type { ElementDocument } from '../../src/domain/element.js';
import { AppError } from '../../src/domain/errors.js';
import { CASCADE_SOFT_LIMIT, ElementService } from '../../src/services/element.service.js';
import { ancestorPaths } from '../../src/repositories/element.repository.js';

describe('ElementService cascade', () => {
  it('cascades directory status to descendants', async () => {
    const folder: ElementDocument = {
      id: 'dir-1',
      project_id: 'p1',
      path: 'src',
      parent_path: '',
      type: 'directory',
      status: 'auto_found',
      is_active: true,
      status_manually_set: false,
    };

    const repo = {
      getById: vi
        .fn()
        .mockResolvedValueOnce(folder)
        .mockResolvedValueOnce({ ...folder, status: 'not_needed', status_manually_set: true }),
      countActiveDescendants: vi.fn(async () => 3),
      updateStatusCascadeByPath: vi.fn(async () => 4),
      updateStatus: vi.fn(),
    };

    const service = new ElementService(repo as never);
    const result = await service.updateStatusWithCascade('p1', 'dir-1', 'not_needed');

    expect(repo.updateStatusCascadeByPath).toHaveBeenCalledWith('p1', 'src', 'not_needed');
    expect(result.cascade?.updated_count).toBe(4);
    expect(result.status).toBe('not_needed');
  });

  it('lifts from not_needed without cascading children', async () => {
    const folder: ElementDocument = {
      id: 'dir-1',
      project_id: 'p1',
      path: 'src',
      parent_path: '',
      type: 'directory',
      status: 'not_needed',
      is_active: true,
      status_manually_set: true,
    };

    const repo = {
      getById: vi.fn(async () => folder),
      updateStatus: vi.fn(async () => ({ ...folder, status: 'needed' })),
      countActiveDescendants: vi.fn(),
      updateStatusCascadeByPath: vi.fn(),
    };

    const service = new ElementService(repo as never);
    await service.updateStatusWithCascade('p1', 'dir-1', 'needed');

    expect(repo.updateStatus).toHaveBeenCalled();
    expect(repo.updateStatusCascadeByPath).not.toHaveBeenCalled();
  });

  it('rejects cascade when soft-limit exceeded', async () => {
    const folder: ElementDocument = {
      id: 'dir-1',
      project_id: 'p1',
      path: 'src',
      parent_path: '',
      type: 'directory',
      status: 'auto_found',
      is_active: true,
      status_manually_set: false,
    };

    const repo = {
      getById: vi.fn(async () => folder),
      countActiveDescendants: vi.fn(async () => CASCADE_SOFT_LIMIT + 1),
      updateStatusCascadeByPath: vi.fn(),
      updateStatus: vi.fn(),
    };

    const service = new ElementService(repo as never);
    await expect(service.updateStatusWithCascade('p1', 'dir-1', 'needed')).rejects.toBeInstanceOf(
      AppError,
    );
    expect(repo.updateStatusCascadeByPath).not.toHaveBeenCalled();
  });

  it('ancestorPaths lists parents nearest-first', () => {
    expect(ancestorPaths('a/b/c.ts')).toEqual(['a/b', 'a']);
  });
});
