import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import {
  ANALYSIS_RUNS_INDEX,
  bootstrapIndices,
  LANGUAGE_REPORTS_INDEX,
  PARSER_ENVELOPES_INDEX,
  SYNC_SNAPSHOTS_INDEX,
} from '../../src/infra/elasticsearch.js';
import { AnalysisRunRepository } from '../../src/repositories/analysis-run.repository.js';
import { LanguageReportRepository } from '../../src/repositories/language-report.repository.js';
import { ParserEnvelopeRepository } from '../../src/repositories/parser-envelope.repository.js';
import { SyncSnapshotRepository } from '../../src/repositories/sync-snapshot.repository.js';
import {
  createTempGitRepo,
  isElasticsearchAvailable,
  waitForProjectSyncSettled,
} from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

async function countByProjectId(
  esClient: Awaited<ReturnType<typeof buildApp>>['esClient'],
  index: string,
  projectId: string,
): Promise<number> {
  const result = await esClient.count({
    index,
    query: { term: { project_id: projectId } },
  });
  return result.count;
}

describe.skipIf(!esAvailable)('project delete analysis cascade (005 / data-model §DELETE)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let fixtureRoot = '';
  let projectId = '';
  const runId = '00000000-0000-4000-8000-000000000031';

  beforeEach(async () => {
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    process.env.DATA_ROOT ??= '/tmp/ods-integration-data';

    fixtureRoot = await createTempGitRepo({
      'src/main.ts': 'export const main = () => 1;',
    });

    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: fixtureRoot,
        name: 'Analysis Delete Test',
      },
    });

    expect([200, 201]).toContain(registerResponse.statusCode);
    projectId = (registerResponse.json() as { id: string }).id;

    const syncStatus = await waitForProjectSyncSettled(app, projectId, app.syncService);
    expect(['success', 'partial']).toContain(syncStatus);

    const reportResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/analysis/language-report/latest`,
    });
    expect(reportResponse.statusCode).toBe(200);

    const changeSetResponse = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/analysis/change-set`,
    });
    expect(changeSetResponse.statusCode).toBe(200);

    await bootstrapIndices(app.esClient);

    const analysisRunRepository = new AnalysisRunRepository(app.esClient);
    const parserEnvelopeRepository = new ParserEnvelopeRepository(app.esClient);

    await analysisRunRepository.create({
      id: runId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000032',
      status: 'success',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      incremental: false,
      change_set: {
        project_id: projectId,
        incremental: false,
        added: [],
        modified: [],
        deleted: [],
      },
      parser_results: [{ parser_id: 'typescript', status: 'success', error_message: null }],
      last_error_message: null,
    });

    const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/envelope-typescript-v1.json');
    const envelopeFixture = JSON.parse(await readFile(fixturePath, 'utf8'));

    await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelopeFixture.parser_id,
      schema_version: envelopeFixture.schema_version,
      generated_at: envelopeFixture.generated_at,
      files_analyzed: envelopeFixture.files_analyzed,
      model: envelopeFixture.model,
    });

    const syncSnapshotRepository = new SyncSnapshotRepository(app.esClient);
    await syncSnapshotRepository.upsert({
      project_id: projectId,
      captured_at: new Date().toISOString(),
      files: [{ path: 'src/main.ts', mtime_ms: Date.now(), size: 24 }],
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('removes all 005 analysis indices when project is deleted', async () => {
    const languageReportRepository = new LanguageReportRepository(app.esClient);
    const syncSnapshotRepository = new SyncSnapshotRepository(app.esClient);

    expect(await languageReportRepository.getLatestByProjectId(projectId)).not.toBeNull();
    expect(await syncSnapshotRepository.getByProjectId(projectId)).not.toBeNull();

    expect(await countByProjectId(app.esClient, LANGUAGE_REPORTS_INDEX, projectId)).toBeGreaterThan(
      0,
    );
    expect(await countByProjectId(app.esClient, ANALYSIS_RUNS_INDEX, projectId)).toBeGreaterThan(0);
    expect(await countByProjectId(app.esClient, PARSER_ENVELOPES_INDEX, projectId)).toBeGreaterThan(
      0,
    );
    expect(await countByProjectId(app.esClient, SYNC_SNAPSHOTS_INDEX, projectId)).toBeGreaterThan(0);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    expect(await countByProjectId(app.esClient, LANGUAGE_REPORTS_INDEX, projectId)).toBe(0);
    expect(await countByProjectId(app.esClient, ANALYSIS_RUNS_INDEX, projectId)).toBe(0);
    expect(await countByProjectId(app.esClient, PARSER_ENVELOPES_INDEX, projectId)).toBe(0);
    expect(await countByProjectId(app.esClient, SYNC_SNAPSHOTS_INDEX, projectId)).toBe(0);
  });
});
