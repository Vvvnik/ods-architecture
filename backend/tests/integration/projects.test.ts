import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import {
  createTempGitRepo,
  isElasticsearchAvailable,
  waitForProjectSyncSettled,
} from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('projects API integration', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let projectId = '';
  let fileElementId = '';
  let fixtureRoot = '';

  beforeAll(async () => {
    process.env.ELASTICSEARCH_URL ??= 'http://localhost:9200';
    process.env.DATA_ROOT ??= '/tmp/ods-integration-data';
    process.env.PORT ??= '3000';

    fixtureRoot = await createTempGitRepo({
      'README.md': '# integration',
      'src/hello.ts': 'export function greet(name: string) { return `Hello, ${name}!`; }',
    });

    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a local project and completes sync', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: fixtureRoot,
        name: 'Integration Sample',
      },
    });

    expect([200, 201]).toContain(response.statusCode);
    const body = response.json() as { id: string };
    projectId = body.id;

    const status = await waitForProjectSyncSettled(app, projectId, app.syncService);
    expect(['success', 'partial']).toContain(status);
  });

  it('returns project tree without .git paths', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/elements?parent_path=&limit=100`,
    });

    expect(response.statusCode).toBe(200);
    const page = response.json() as { items: Array<{ path: string; type: string }> };
    expect(page.items.length).toBeGreaterThan(0);
    expect(page.items.some((item) => item.path.includes('.git'))).toBe(false);

    const srcResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/elements?parent_path=src&limit=100`,
    });
    const srcPage = srcResponse.json() as { items: Array<{ id: string; path: string }> };
    const file = srcPage.items.find((item) => item.path.endsWith('.ts'));
    expect(file).toBeDefined();
    fileElementId = file!.id;
  });

  it('reads file content and updates element status', async () => {
    const contentResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/elements/${fileElementId}/content`,
    });

    expect(contentResponse.statusCode).toBe(200);
    const content = contentResponse.json() as { kind: string; content?: string };
    expect(content.kind).toBe('text');
    expect(content.content).toContain('greet');

    const patchResponse = await app.inject({
      method: 'PATCH',
      url: `/api/v1/projects/${projectId}/elements/${fileElementId}`,
      payload: { status: 'needed' },
    });

    expect(patchResponse.statusCode).toBe(200);
    expect((patchResponse.json() as { status: string }).status).toBe('needed');

    const getResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/elements/${fileElementId}`,
    });
    expect((getResponse.json() as { status: string }).status).toBe('needed');
  });

  it('accepts repeat manual sync after success (SC-003)', async () => {
    const status = await waitForProjectSyncSettled(app, projectId, app.syncService);
    expect(['success', 'partial']).toContain(status);

    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/sync`,
    });
    expect(first.statusCode).toBe(202);

    const afterFirst = await waitForProjectSyncSettled(app, projectId, app.syncService);
    expect(['success', 'partial']).toContain(afterFirst);

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/sync`,
    });
    expect(second.statusCode).toBe(202);
  });

  it('rejects parallel manual sync with 409', async () => {
    await waitForProjectSyncSettled(app, projectId, app.syncService);

    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/sync`,
    });
    expect(first.statusCode).toBe(202);

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${projectId}/sync`,
    });
    expect(second.statusCode).toBe(409);
    expect(second.json()).toMatchObject({ code: 'sync_in_progress' });
  });
});

describe.skipIf(!esAvailable)('idempotent registration', () => {
  it('returns the same project id for the same source', async () => {
    const repo = await createTempGitRepo({ 'a.txt': 'a' });
    const app = await buildApp();

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repo,
        name: 'Idempotent',
      },
    });

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repo,
        name: 'Idempotent',
      },
    });

    expect((first.json() as { id: string }).id).toBe((second.json() as { id: string }).id);
    await app.close();
  });
});
