import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ElementDocument } from '../../src/domain/element.js';
import type { ProjectDocument } from '../../src/domain/project.js';
import { FileContentService } from '../../src/services/file-content.service.js';

describe('FileContentService', () => {
  let workDir: string;
  let project: ProjectDocument;
  let element: ElementDocument;
  let service: FileContentService;

  beforeEach(async () => {
    workDir = await mkdtemp(join(tmpdir(), 'ods-file-'));
    project = {
      id: 'p1',
      name: 'Test',
      source_type: 'local_path',
      source_value: workDir,
      working_copy_root: workDir,
      created_at: new Date().toISOString(),
      last_sync_at: null,
      sync_status: 'success',
      last_error_message: null,
    };
    element = {
      id: 'e1',
      project_id: project.id,
      path: 'hello.txt',
      parent_path: '',
      type: 'file',
      status: 'auto_found',
      is_active: true,
      status_manually_set: false,
    };

    const projectRepository = {
      getById: vi.fn(async () => project),
    };
    const elementRepository = {
      getById: vi.fn(async () => element),
    };

    service = new FileContentService(projectRepository as never, elementRepository as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns UTF-8 text content', async () => {
    await writeFile(join(workDir, 'hello.txt'), 'Привет, ODS', 'utf8');

    const result = await service.getFileContent(project.id, element.id);

    expect(result.kind).toBe('text');
    expect(result.content).toBe('Привет, ODS');
  });

  it('returns not_text for binary files', async () => {
    await writeFile(join(workDir, 'hello.txt'), Buffer.from([0x00, 0x01, 0x02]));

    const result = await service.getFileContent(project.id, element.id);

    expect(result.kind).toBe('not_text');
  });

  it('returns file_not_available for inactive elements', async () => {
    element = { ...element, is_active: false };

    const result = await service.getFileContent(project.id, element.id);

    expect(result).toEqual({ kind: 'error', error_code: 'file_not_available' });
  });

  it('returns encoding_unsupported for invalid UTF-8 sequences', async () => {
    await writeFile(join(workDir, 'hello.txt'), Buffer.from([0xc3, 0x28]));

    const result = await service.getFileContent(project.id, element.id);

    expect(result.kind).toBe('error');
    expect(result.error_code).toBe('encoding_unsupported');
  });
});
