import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { AiJobDocument } from '../../src/domain/ai-job.js';
import { AgentPromptService } from '../../src/services/agent-prompt.service.js';

describe('AgentPromptService code prompt', () => {
  let directory = '';

  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('renders code-job placeholders and writes AGENT-CODE through DocsService', async () => {
    directory = await mkdtemp(join(tmpdir(), 'ods-code-prompt-'));
    const template = join(directory, 'code.md');
    await writeFile(template, '<ODS_BASE_URL> <PROJECT_ID> <ANALYSIS_RUN_ID> <CODE_JOB_ID>');
    const writes: Array<[string, string]> = [];
    const service = new AgentPromptService(
      {
        PORT: 3000, ELASTICSEARCH_URL: 'http://localhost:9200', DATA_ROOT: directory,
        LOCAL_REPOS_MOUNT: '/repos', LOCAL_REPOS_HOST_PATH: '', LOCAL_PATH_MAP: '', GIT_CLONE_DEPTH: 1,
        PARSERS_ROOT: directory, PUBLIC_API_BASE_URL: '', DOCS_PROMPT_TEMPLATE: template,
        CODE_PROMPT_TEMPLATE: template, AI_GRAPH_WC_MAX_FILE_BYTES: 1_048_576,
        ANALYSIS_PARSER_TIMEOUT_MS: 600_000, ANALYSIS_MAX_PARALLEL_PARSERS: 2,
        ANALYSIS_PARSER_FILE_CHUNK_SIZE: 500, ANALYSIS_REQUIRE_PREBUILT: false, ANALYSIS_DETECTOR_DENYLIST: [],
      },
      { writeCodeAgent: async (projectId: string, content: string) => { writes.push([projectId, content]); } } as never,
    );
    const job = {
      id: 'code-job', project_id: 'project', analysis_run_id: 'run', kind: 'graph_from_wc',
      status: 'running', docs_language: 'en', docs_write_mode: 'overwrite', docs_generation_id: null,
      progress: {}, summary: null, provenance: { started_at: '' }, created_at: '', updated_at: '',
    } satisfies AiJobDocument;

    const rendered = await service.renderCodeForJob(job, 'https://ods.example/api/v1');
    await service.writeCodeAgent(job.project_id, rendered);

    expect(rendered).toBe('https://ods.example/api/v1 project run code-job');
    expect(writes).toEqual([['project', rendered]]);
  });
});
