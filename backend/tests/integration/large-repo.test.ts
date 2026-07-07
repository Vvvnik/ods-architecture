import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import { createManyFiles, createTempGitRepo, isElasticsearchAvailable } from '../helpers/test-utils.js';

const execFileAsync = promisify(execFile);
const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('large repository sync smoke', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let projectId = '';

  beforeAll(async () => {
    process.env.ELASTICSEARCH_URL ??= 'http://localhost:9200';
    process.env.DATA_ROOT ??= '/tmp/ods-large-data';

    const repo = await createTempGitRepo();
    for (let bucket = 0; bucket < 10; bucket += 1) {
      await createManyFiles(repo, `dir-${bucket}`, 100, `f${bucket}`);
    }
    await execFileAsync('git', ['add', '.'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'large'], { cwd: repo });

    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const started = Date.now();
    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repo,
        name: 'Large Repo',
      },
    });
    projectId = (register.json() as { id: string }).id;

    let status = 'running';
    while (status === 'running' && Date.now() - started < 60_000) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const poll = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}`,
      });
      status = (poll.json() as { sync_status: string }).sync_status;
    }

    expect(['success', 'partial']).toContain(status);
    expect(Date.now() - started).toBeLessThan(60_000);
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('indexes at least 1000 files across the tree', async () => {
    let totalIndexed = 0;
    const roots = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/elements?parent_path=&limit=100`,
    });
    const rootPage = roots.json() as { items: Array<{ path: string; type: string }> };
    totalIndexed += rootPage.items.length;

    for (const item of rootPage.items) {
      if (item.type !== 'directory') {
        continue;
      }
      const children = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}/elements?parent_path=${encodeURIComponent(item.path)}&limit=100`,
      });
      const page = children.json() as { total: number };
      totalIndexed += page.total;
    }

    expect(totalIndexed).toBeGreaterThanOrEqual(1000);
  });
});
