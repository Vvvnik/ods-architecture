import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import {
  createManyFiles,
  createTempGitRepo,
  isElasticsearchAvailable,
} from '../helpers/test-utils.js';

const execFileAsync = promisify(execFile);
const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('children pagination performance (SC-004)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let projectId = '';

  beforeAll(async () => {
    process.env.ELASTICSEARCH_URL ??= 'http://localhost:9200';
    process.env.DATA_ROOT ??= '/tmp/ods-perf-data';

    const repo = await createTempGitRepo();
    await createManyFiles(repo, 'bulk', 520, 'item');
    await execFileAsync('git', ['add', '.'], { cwd: repo });
    await execFileAsync('git', ['commit', '-m', 'bulk'], { cwd: repo });

    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const register = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repo,
        name: 'Perf Bulk',
      },
    });
    projectId = (register.json() as { id: string }).id;

    let status = 'running';
    for (let attempt = 0; attempt < 180 && status === 'running'; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const poll = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${projectId}`,
      });
      status = (poll.json() as { sync_status: string }).sync_status;
    }
    expect(['success', 'partial']).toContain(status);
  }, 120_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns the first children page within 2 seconds', async () => {
    const started = Date.now();
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/elements?parent_path=bulk&limit=100&offset=0`,
    });
    const elapsed = Date.now() - started;

    expect(response.statusCode).toBe(200);
    const page = response.json() as { items: unknown[]; total: number; limit: number };
    expect(page.items.length).toBeLessThanOrEqual(100);
    expect(page.total).toBeGreaterThanOrEqual(520);
    expect(elapsed).toBeLessThan(2000);
  });
});
