import { describe, expect, it, vi } from 'vitest';

import { AppError } from '../../src/domain/errors.js';
import { GraphService } from '../../src/services/graph.service.js';

describe('GraphService.search', () => {
  it('rejects short query', async () => {
    const service = new GraphService(
      { getById: vi.fn(), listByProjectId: vi.fn() } as never,
      { search: vi.fn() } as never,
      { search: vi.fn() } as never,
    );

    await expect(service.search('p1', 'a')).rejects.toBeInstanceOf(AppError);
  });
});
