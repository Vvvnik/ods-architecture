import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import { createTempGitRepo, isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('AnalysisOrchestrator integration', () => {
  let repoRoot: string;
  let parsersRoot: string;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    repoRoot = await createTempGitRepo({
      'src/main.ts': "import { util } from '../lib/util.ts';\nexport function main() { return util(); }",
      'lib/util.ts': 'export function util() { return 2; }',
    });

    parsersRoot = await mkdtemp(join(tmpdir(), 'ods-parsers-'));
    const typescriptDir = join(parsersRoot, 'typescript');
    await mkdir(typescriptDir, { recursive: true });
    execSync(`cp -R "${join(process.cwd(), '../parsers/typescript')}/." "${typescriptDir}/"`);
    execSync('npm ci', { cwd: typescriptDir, stdio: 'pipe' });

    process.env.PARSERS_ROOT = parsersRoot;
    process.env.DATA_ROOT = await mkdtemp(join(tmpdir(), 'ods-data-'));
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';

    app = await buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    await rm(repoRoot, { recursive: true, force: true });
    await rm(parsersRoot, { recursive: true, force: true });
  });

  it('runs typescript parser in file_count order and stores envelope', async () => {
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: repoRoot,
        name: 'Orchestrator test',
      },
    });
    expect(registerResponse.statusCode).toBe(201);
    const project = registerResponse.json() as { id: string };

    await waitFor(async () => {
      const projectResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}`,
      });
      const body = projectResponse.json() as { sync_status: string };
      return body.sync_status === 'success' || body.sync_status === 'partial';
    }, 15_000);

    let reportResponse;
    await waitFor(async () => {
      reportResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/analysis/language-report/latest`,
      });
      return reportResponse.statusCode === 200;
    }, 15_000);

    expect(reportResponse!.statusCode).toBe(200);
    const report = reportResponse.json() as { id: string; languages: Array<{ language: string }> };
    expect(report.languages[0]?.language).toBe('typescript');

    const runResponse = await app.inject({
      method: 'POST',
      url: `/api/v1/projects/${project.id}/analysis/runs`,
      payload: {
        language_report_id: report.id,
        confirmed_change_set: true,
      },
    });
    expect(runResponse.statusCode).toBe(202);
    const run = runResponse.json() as { id: string };

    await waitFor(async () => {
      const statusResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/analysis/runs/${run.id}`,
      });
      const body = statusResponse.json() as { status: string };
      return ['success', 'partial', 'failed'].includes(body.status);
    }, 20_000);

    const finalRun = (
      await app.inject({
        method: 'GET',
        url: `/api/v1/projects/${project.id}/analysis/runs/${run.id}`,
      })
    ).json() as { status: string; parser_results?: Array<{ parser_id: string; status: string }> };

    expect(['success', 'partial']).toContain(finalRun.status);
    expect(finalRun.parser_results?.[0]).toMatchObject({ parser_id: 'typescript', status: 'success' });

    const envelopesResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${project.id}/analysis/runs/${run.id}/envelopes`,
    });
    expect(envelopesResponse.statusCode).toBe(200);
    const envelopes = envelopesResponse.json() as Array<{
      parser_id: string;
      model: { symbols?: unknown[] };
    }>;
    expect(envelopes).toHaveLength(1);
    expect(envelopes[0].parser_id).toBe('typescript');
    expect(envelopes[0].model.symbols?.length).toBeGreaterThan(0);
  }, 30_000);
});

async function waitFor(predicate: () => Promise<boolean>, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('timeout waiting for condition');
}
