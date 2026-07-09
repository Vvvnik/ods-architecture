import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import {
  bootstrapIndices,
  GRAPH_EDGES_INDEX,
  GRAPH_NODES_INDEX,
} from '../../src/infra/elasticsearch.js';
import { AnalysisRunRepository } from '../../src/repositories/analysis-run.repository.js';
import { GraphEdgeRepository } from '../../src/repositories/graph-edge.repository.js';
import { GraphNodeRepository } from '../../src/repositories/graph-node.repository.js';
import { ParserEnvelopeRepository } from '../../src/repositories/parser-envelope.repository.js';
import { typescriptIngestAdapter } from '../../src/services/ingest/adapters/typescript.ingest.js';
import { IngestRegistryService } from '../../src/services/ingest/ingest-registry.service.js';
import { IngestService } from '../../src/services/ingest/ingest.service.js';
import {
  createTempGitRepo,
  isElasticsearchAvailable,
  waitForProjectSyncSettled,
} from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('project delete graph cascade (US6 / SC-005)', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let fixtureRoot = '';
  let projectId = '';
  const runId = '00000000-0000-4000-8000-000000000021';

  beforeEach(async () => {
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    process.env.DATA_ROOT ??= '/tmp/ods-integration-data';

    fixtureRoot = await createTempGitRepo({
      'src/main.ts': 'export const main = () => 1;',
      'lib/util.ts': 'export const util = () => 2;',
    });

    app = await buildApp();
    await app.listen({ port: 0, host: '127.0.0.1' });

    const registerResponse = await app.inject({
      method: 'POST',
      url: '/api/v1/projects',
      payload: {
        source_type: 'local_path',
        source_value: fixtureRoot,
        name: 'Graph Delete Test',
      },
    });

    expect([200, 201]).toContain(registerResponse.statusCode);
    projectId = (registerResponse.json() as { id: string }).id;

    const syncStatus = await waitForProjectSyncSettled(app, projectId, app.syncService);
    expect(['success', 'partial']).toContain(syncStatus);

    const esClient = app.esClient;
    await bootstrapIndices(esClient);

    const analysisRunRepository = new AnalysisRunRepository(esClient);
    const parserEnvelopeRepository = new ParserEnvelopeRepository(esClient);
    const graphNodeRepository = new GraphNodeRepository(esClient);
    const graphEdgeRepository = new GraphEdgeRepository(esClient);

    const ingestRegistry = new IngestRegistryService();
    ingestRegistry.register(typescriptIngestAdapter);

    const ingestService = new IngestService(
      parserEnvelopeRepository,
      analysisRunRepository,
      graphNodeRepository,
      graphEdgeRepository,
      app.elementRepository,
      ingestRegistry,
    );

    await analysisRunRepository.create({
      id: runId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000022',
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
      parser_results: [],
      last_error_message: null,
    });

    const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/envelope-typescript-v1.json');
    const envelopeFixture = JSON.parse(await readFile(fixturePath, 'utf8'));

    const saved = await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelopeFixture.parser_id,
      schema_version: envelopeFixture.schema_version,
      generated_at: envelopeFixture.generated_at,
      files_analyzed: envelopeFixture.files_analyzed,
      model: envelopeFixture.model,
    });

    await ingestService.ingestEnvelope(saved.id);
    await ingestService.completeRun(runId);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('removes all graph nodes and edges when project is deleted', async () => {
    const graphNodeRepository = new GraphNodeRepository(app.esClient);
    const graphEdgeRepository = new GraphEdgeRepository(app.esClient);

    const nodeCountBefore = await graphNodeRepository.countByProjectAndRun(projectId, runId);
    const edgeCountBefore = await graphEdgeRepository.countByProjectAndRun(projectId, runId);
    expect(nodeCountBefore).toBeGreaterThan(0);
    expect(edgeCountBefore).toBeGreaterThan(0);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      url: `/api/v1/projects/${projectId}`,
    });
    expect(deleteResponse.statusCode).toBe(204);

    const nodesAfter = await app.esClient.count({
      index: GRAPH_NODES_INDEX,
      query: { term: { project_id: projectId } },
    });
    const edgesAfter = await app.esClient.count({
      index: GRAPH_EDGES_INDEX,
      query: { term: { project_id: projectId } },
    });

    expect(nodesAfter.count).toBe(0);
    expect(edgesAfter.count).toBe(0);
  });
});
