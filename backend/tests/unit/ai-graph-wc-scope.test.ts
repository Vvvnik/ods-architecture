import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ElementDocument } from '../../src/domain/element.js';
import { AppError } from '../../src/domain/errors.js';
import { AiGraphWorkingCopyService } from '../../src/services/ai-graph-wc.service.js';

describe('AiGraphWorkingCopyService', () => {
  let root: string;
  let elements: Map<string, ElementDocument>;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ods-ai-wc-'));
    await mkdir(join(root, 'src'));
    await writeFile(join(root, 'src', 'allowed.ts'), 'export const value = 1;');
    await writeFile(join(root, 'src', 'large.ts'), 'x'.repeat(32));
    elements = new Map([
      ['src/allowed.ts', element('src/allowed.ts', 'needed')],
      ['src/private.ts', element('src/private.ts', 'not_needed')],
      ['src/large.ts', element('src/large.ts', 'auto_found')],
    ]);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('exposes only active Status-scoped files and rejects oversized content', async () => {
    const service = new AiGraphWorkingCopyService(
      { getById: async () => ({ working_copy_root: root }) } as never,
      { loadActiveByProject: async () => elements } as never,
      { assertCurrentRunning: async () => ({ kind: 'graph_from_wc' }) } as never,
      16,
    );

    await expect(service.listPaths('project', 'job')).resolves.toEqual({ paths: ['src/allowed.ts', 'src/large.ts'] });
    await expect(service.readContent('project', 'job', 'src/private.ts')).rejects.toMatchObject<AppError>({
      code: 'not_found',
    });
    await expect(service.readContent('project', 'job', 'src/large.ts')).rejects.toMatchObject<AppError>({
      code: 'file_too_large',
      statusCode: 413,
    });
  });
});

function element(path: string, status: ElementDocument['status']): ElementDocument {
  return {
    id: path,
    project_id: 'project',
    path,
    parent_path: 'src',
    type: 'file',
    status,
    is_active: true,
    status_manually_set: false,
  };
}
