import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AppError } from '../../src/domain/errors.js';
import { DocsService } from '../../src/services/docs.service.js';

describe('DocsService', () => {
  let dataRoot: string;
  let service: DocsService;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), 'ods-docs-'));
    service = new DocsService({
      PORT: 3000,
      ELASTICSEARCH_URL: 'http://localhost:9200',
      DATA_ROOT: dataRoot,
      LOCAL_REPOS_MOUNT: '/repos',
      GIT_CLONE_DEPTH: 1,
      PARSERS_ROOT: './parsers',
      PUBLIC_API_BASE_URL: '',
      DOCS_PROMPT_TEMPLATE: './prompts/docs-agent-prompt.md',
      ANALYSIS_PARSER_TIMEOUT_MS: 600_000,
      ANALYSIS_MAX_PARALLEL_PARSERS: 2,
    ANALYSIS_PARSER_FILE_CHUNK_SIZE: 500,
      ANALYSIS_DETECTOR_DENYLIST: [],
    });
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it('rejects paths that escape the project docs root', async () => {
    await expect(service.read('project-1', '../secret.md')).rejects.toMatchObject<AppError>({
      code: 'docs_path_invalid',
      statusCode: 400,
    });
    await expect(
      service.write('project-1', '/tmp/secret.md', 'secret', {
        mode: 'overwrite',
        generationId: null,
      }),
    ).rejects.toMatchObject<AppError>({ code: 'docs_path_invalid' });
  });

  it('enforces overwrite and versioned write locations', async () => {
    await service.write('project-1', 'spec-root.md', '# Root', {
      mode: 'overwrite',
      generationId: null,
    });
    expect(await service.read('project-1', 'spec-root.md')).toBe('# Root');

    await expect(
      service.write('project-1', '_generations/generation-1/spec-root.md', '# Invalid', {
        mode: 'overwrite',
        generationId: null,
      }),
    ).rejects.toMatchObject<AppError>({ code: 'docs_path_invalid' });

    await service.write('project-1', '_generations/generation-1/spec-root.md', '# Versioned', {
      mode: 'versioned',
      generationId: 'generation-1',
    });
    expect(await service.read('project-1', '_generations/generation-1/spec-root.md')).toBe(
      '# Versioned',
    );
  });
});
