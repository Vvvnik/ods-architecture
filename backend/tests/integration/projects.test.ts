import { randomUUID } from 'node:crypto';
import { access, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe.skipIf(!esAvailable)('project delete (SC-006)', () => {
  it('deletes project, allows re-registration with new id, rejects delete while running', async () => {
    const repo = await createTempGitRepo({
      'README.md': '# delete test',
      'src/a.ts': 'export const a = 1;',
    });
    const app = await buildApp();

    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repo,
        name: 'Delete Me',
      },
    });
    expect(register.statusCode).toBe(201);
    const firstId = (register.json() as { id: string }).id;

    await waitForProjectSyncSettled(app, firstId, app.syncService);

    await app.projectRepository.update(firstId, { sync_status: 'running' });
    const conflict = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${firstId}`,
    });
    expect(conflict.statusCode).toBe(409);
    expect(conflict.json()).toMatchObject({ code: 'sync_in_progress' });

    await app.projectRepository.update(firstId, { sync_status: 'success' });

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${firstId}`,
    });
    expect(deleted.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    const ids = (list.json() as Array<{ id: string }>).map((p) => p.id);
    expect(ids).not.toContain(firstId);

    const getDeleted = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${firstId}`,
    });
    expect(getDeleted.statusCode).toBe(404);

    const reRegister = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repo,
        name: 'Delete Me Again',
      },
    });
    expect(reRegister.statusCode).toBe(201);
    const secondId = (reRegister.json() as { id: string }).id;
    expect(secondId).not.toBe(firstId);
    expect((reRegister.json() as { name: string }).name).toBe('Delete Me Again');

    const notFound = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${randomUUID()}`,
    });
    expect(notFound.statusCode).toBe(404);

    await app.close();
  });

  it('removes git_url working copy directory after delete (SC-006 / US5/AC2)', async () => {
    const repo = await createTempGitRepo({ 'README.md': '# git wc delete' });
    const dataRoot = await mkdtemp(join(tmpdir(), 'ods-git-delete-'));
    process.env.DATA_ROOT = dataRoot;

    const app = await buildApp();
    const gitUrl = `file://${repo}`;

    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'git_url',
        source_value: gitUrl,
        name: 'Git Delete',
      },
    });
    expect(register.statusCode).toBe(201);
    const projectId = (register.json() as { id: string }).id;

    await waitForProjectSyncSettled(app, projectId, app.syncService);

    const stored = await app.projectRepository.getById(projectId);
    expect(stored?.working_copy_root).toBeTruthy();
    const workingCopyRoot = stored!.working_copy_root;
    expect(await pathExists(workingCopyRoot)).toBe(true);

    const deleted = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}`,
    });
    expect(deleted.statusCode).toBe(204);
    expect(await pathExists(workingCopyRoot)).toBe(false);

    await app.close();
  });
});

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!esAvailable)('registration validation', () => {
  it('does not persist project when local path is unreachable', async () => {
    const app = await buildApp();
    const badPath = `/nonexistent/ods-path-${randomUUID()}`;

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: badPath,
        name: 'Unreachable',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'source_unreachable' });

    const list = await app.inject({
      method: 'GET',
      url: '/api/v1/projects',
    });
    const projects = list.json() as Array<{ source_value: string }>;
    expect(projects.some((project) => project.source_value === badPath)).toBe(false);

    await app.close();
  });
});
