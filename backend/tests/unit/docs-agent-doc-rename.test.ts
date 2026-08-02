import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { AppConfig } from '../../src/config.js';
import { AppError } from '../../src/domain/errors.js';
import {
  AGENT_CODE_FILE,
  AGENT_DOC_FILE,
  AGENT_MD_LEGACY,
  DocsService,
} from '../../src/services/docs.service.js';

function testConfig(dataRoot: string): AppConfig {
  return {
    PORT: 3000,
    ELASTICSEARCH_URL: 'http://localhost:9200',
    DATA_ROOT: dataRoot,
    LOCAL_REPOS_MOUNT: '/repos',
    LOCAL_REPOS_HOST_PATH: '',
    LOCAL_PATH_MAP: '',
    GIT_CLONE_DEPTH: 1,
    PARSERS_ROOT: './parsers',
    PUBLIC_API_BASE_URL: '',
    DOCS_PROMPT_TEMPLATE: './prompts/docs-agent-prompt.md',
    CODE_PROMPT_TEMPLATE: './prompts/code-agent-prompt.md',
    AI_GRAPH_WC_MAX_FILE_BYTES: 1_048_576,
    ANALYSIS_PARSER_TIMEOUT_MS: 600_000,
    ANALYSIS_MAX_PARALLEL_PARSERS: 2,
    ANALYSIS_PARSER_FILE_CHUNK_SIZE: 500,
    ANALYSIS_REQUIRE_PREBUILT: false,
    ANALYSIS_DETECTOR_DENYLIST: [],
  };
}

describe('AGENT-DOC rename and reserved paths', () => {
  let dataRoot: string;
  let service: DocsService;

  beforeEach(async () => {
    dataRoot = await mkdtemp(join(tmpdir(), 'ods-agent-doc-'));
    service = new DocsService(testConfig(dataRoot));
  });

  afterEach(async () => {
    await rm(dataRoot, { recursive: true, force: true });
  });

  it('renames legacy AGENT.md to AGENT-DOC.md when DOC is missing', async () => {
    const projectId = 'project-1';
    const root = join(dataRoot, 'docs', projectId);
    await mkdir(root, { recursive: true });
    await writeFile(join(root, AGENT_MD_LEGACY), '# legacy prompt', 'utf8');

    expect(await service.migrateLegacyAgentIfNeeded(projectId)).toBe(true);
    expect(await readFile(join(root, AGENT_DOC_FILE), 'utf8')).toBe('# legacy prompt');
    await expect(readFile(join(root, AGENT_MD_LEGACY), 'utf8')).rejects.toMatchObject({
      code: 'ENOENT',
    });
    expect(await service.hasAgent(projectId)).toBe(true);
  });

  it('is a no-op when AGENT-DOC.md already exists', async () => {
    const projectId = 'project-2';
    await service.writeAgent(projectId, '# doc');
    const root = join(dataRoot, 'docs', projectId);
    await writeFile(join(root, AGENT_MD_LEGACY), '# leftover legacy', 'utf8');

    expect(await service.migrateLegacyAgentIfNeeded(projectId)).toBe(false);
    expect(await readFile(join(root, AGENT_DOC_FILE), 'utf8')).toBe('# doc');
    expect(await readFile(join(root, AGENT_MD_LEGACY), 'utf8')).toBe('# leftover legacy');
  });

  it('is a no-op when neither legacy nor DOC exists', async () => {
    expect(await service.migrateLegacyAgentIfNeeded('project-empty')).toBe(false);
    expect(await service.hasAgent('project-empty')).toBe(false);
  });

  it('writeAgent / hasAgent use AGENT-DOC.md', async () => {
    await service.writeAgent('p', '# seeded');
    expect(await service.hasAgent('p')).toBe(true);
    expect(await service.read('p', AGENT_DOC_FILE)).toBe('# seeded');
  });

  it.each([AGENT_DOC_FILE, AGENT_CODE_FILE, AGENT_MD_LEGACY])(
    'rejects agent write to reserved %s',
    async (path) => {
      await expect(
        service.write('p', path, 'hijack', {
          mode: 'overwrite',
          generationId: null,
        }),
      ).rejects.toMatchObject<AppError>({
        code: 'docs_agent_file_reserved',
        statusCode: 403,
      });
    },
  );

  it('allows ODS writeAgent for AGENT-DOC.md via allowAgentFile', async () => {
    await service.writeAgent('p', '# ok');
    expect(await service.read('p', AGENT_DOC_FILE)).toBe('# ok');
  });
});
