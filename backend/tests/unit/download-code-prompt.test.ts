import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { registerDocsRoutes } from '../../src/api/routes/docs.js';

describe('POST download-code-prompt', () => {
  const apps: Array<ReturnType<typeof Fastify>> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('requires a parser graph-ready run for first download, then permits an AI-ready run', async () => {
    const app = Fastify();
    apps.push(app);
    app.decorate('config', { PUBLIC_API_BASE_URL: 'https://ods.example/api/v1' } as never);
    const writes: string[] = [];
    let hasCodeAgent = false;
    let hasSucceeded = false;
    const runs = [
      {
        id: 'parser-run', project_id: 'project', language_report_id: 'language', status: 'success',
        ingest_status: 'success', graph_builder: 'parsers', started_at: '', incremental: false,
      },
    ];
    registerDocsRoutes(app, {
      projectRepository: { getById: async () => ({ id: 'project' }) } as never,
      analysisRunRepository: {
        listByProjectId: async () => runs,
        create: async (input: Record<string, unknown>) => ({ ...input, id: 'ai-run' }),
      } as never,
      graphNodeRepository: { countByProjectAndRun: async () => 1 } as never,
      docsService: {
        hasCodeAgent: async () => hasCodeAgent,
      } as never,
      aiJobService: {
        hasSucceeded: async () => hasSucceeded,
        createRunning: async () => ({
          id: 'job', project_id: 'project', analysis_run_id: 'ai-run', kind: 'graph_from_wc',
          docs_language: 'en', docs_write_mode: 'overwrite', docs_generation_id: null,
        }),
      } as never,
      agentPromptService: {
        renderCodeForJob: async () => '# code prompt',
        writeCodeAgent: async () => { writes.push('AGENT-CODE.md'); },
      } as never,
    });

    runs.splice(0, 1, {
      id: 'ai-ready-run', project_id: 'project', language_report_id: 'language', status: 'success',
      ingest_status: 'success', graph_builder: 'ai', started_at: '', incremental: false,
    });
    const blocked = await app.inject({ method: 'POST', url: '/api/v1/projects/project/docs/download-code-prompt' });
    expect(blocked.statusCode).toBe(409);

    runs.splice(0, 1, {
      id: 'parser-run', project_id: 'project', language_report_id: 'language', status: 'success',
      ingest_status: 'success', graph_builder: 'parsers', started_at: '', incremental: false,
    });
    const first = await app.inject({ method: 'POST', url: '/api/v1/projects/project/docs/download-code-prompt' });
    expect(first.statusCode).toBe(200);
    expect(first.headers['x-ods-ai-job-id']).toBe('job');
    expect(writes).toEqual(['AGENT-CODE.md']);

    runs.splice(0, 1, {
      id: 'ai-ready-run', project_id: 'project', language_report_id: 'language', status: 'success',
      ingest_status: 'success', graph_builder: 'ai', started_at: '', incremental: false,
    });
    hasCodeAgent = true;
    hasSucceeded = true;
    const subsequent = await app.inject({ method: 'POST', url: '/api/v1/projects/project/docs/download-code-prompt' });
    expect(subsequent.statusCode).toBe(200);
  });
});
