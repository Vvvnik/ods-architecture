import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../../src/index.js';
import {
  bootstrapIndices,
  createElasticsearchClient,
  GRAPH_EDGES_INDEX,
  GRAPH_NODES_INDEX,
  PROJECTS_INDEX,
} from '../../src/infra/elasticsearch.js';
import { AnalysisRunRepository } from '../../src/repositories/analysis-run.repository.js';
import { ElementRepository } from '../../src/repositories/element.repository.js';
import { GraphEdgeRepository } from '../../src/repositories/graph-edge.repository.js';
import { GraphNodeRepository } from '../../src/repositories/graph-node.repository.js';
import { ParserEnvelopeRepository } from '../../src/repositories/parser-envelope.repository.js';
import { ProjectRepository } from '../../src/repositories/project.repository.js';
import { typescriptIngestAdapter } from '../../src/services/ingest/adapters/typescript.ingest.js';
import { IngestRegistryService } from '../../src/services/ingest/ingest-registry.service.js';
import { IngestService } from '../../src/services/ingest/ingest.service.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

type ExpectedFileDependencies = {
  path: string;
  edges: Array<{
    type: string;
    from: string;
    to: string;
    path: string;
  }>;
};

describe.skipIf(!esAvailable)('graph file dependencies (SC-002)', () => {
  const projectId = '00000000-0000-4000-8000-000000000020';
  const runId = '00000000-0000-4000-8000-000000000021';

  let esClient: ReturnType<typeof createElasticsearchClient>;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    esClient = createElasticsearchClient({
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
    } as ReturnType<typeof import('../../src/config.js').loadConfig>);

    await bootstrapIndices(esClient);

    const analysisRunRepository = new AnalysisRunRepository(esClient);
    const parserEnvelopeRepository = new ParserEnvelopeRepository(esClient);
    const graphNodeRepository = new GraphNodeRepository(esClient);
    const graphEdgeRepository = new GraphEdgeRepository(esClient);
    const elementRepository = new ElementRepository(esClient);
    const projectRepository = new ProjectRepository(esClient);

    await projectRepository.create({
      id: projectId,
      name: 'SC-002 fixture project',
      source_type: 'local_path',
      source_value: '/tmp/sc-002-fixture',
      working_copy_root: '/tmp/sc-002-fixture',
      created_at: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      sync_status: 'success',
      last_error_message: null,
    });

    const ingestRegistry = new IngestRegistryService();
    ingestRegistry.register(typescriptIngestAdapter);

    const ingestService = new IngestService(
      parserEnvelopeRepository,
      analysisRunRepository,
      graphNodeRepository,
      graphEdgeRepository,
      elementRepository,
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

    const envelopePath = join(process.cwd(), 'tests/fixtures/ingest/envelope-typescript-v1.json');
    const envelopeFixture = JSON.parse(await readFile(envelopePath, 'utf8'));

    await ingestService.ingestNative({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelopeFixture.parser_id,
      schema_version: envelopeFixture.schema_version,
      generated_at: envelopeFixture.generated_at,
      files_analyzed: envelopeFixture.files_analyzed,
      model: envelopeFixture.model,
    });

    await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelopeFixture.parser_id,
      schema_version: envelopeFixture.schema_version,
      generated_at: envelopeFixture.generated_at,
      files_analyzed: envelopeFixture.files_analyzed,
    });
    await ingestService.completeRun(runId);

    app = await buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    await esClient.deleteByQuery({
      index: GRAPH_NODES_INDEX,
      refresh: true,
      query: { term: { project_id: projectId } },
    });
    await esClient.deleteByQuery({
      index: GRAPH_EDGES_INDEX,
      refresh: true,
      query: { term: { project_id: projectId } },
    });
    await esClient.deleteByQuery({
      index: 'ods-analysis-runs',
      refresh: true,
      query: { term: { project_id: projectId } },
    });
    await esClient.deleteByQuery({
      index: 'ods-parser-envelopes',
      refresh: true,
      query: { term: { project_id: projectId } },
    });
    await esClient.delete({
      index: PROJECTS_INDEX,
      id: projectId,
      refresh: true,
    }).catch(() => undefined);
  });

  it('returns 100% of expected fixture edges for file dependencies', async () => {
    const fixturePath = join(
      process.cwd(),
      'tests/fixtures/graph/expected-file-dependencies.json',
    );
    const expected = JSON.parse(await readFile(fixturePath, 'utf8')) as ExpectedFileDependencies;

    const encodedPath = encodeURIComponent(expected.path);
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/files/${encodedPath}/dependencies`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      path: string;
      edges: Array<{ type: string; from: string; to: string; path: string }>;
    };

    expect(body.path).toBe(expected.path);

    for (const expectedEdge of expected.edges) {
      const match = body.edges.find(
        (edge) =>
          edge.type === expectedEdge.type &&
          edge.from === expectedEdge.from &&
          edge.to === expectedEdge.to &&
          edge.path === expectedEdge.path,
      );
      expect(match, `missing edge ${expectedEdge.type} ${expectedEdge.from} → ${expectedEdge.to}`).toBeDefined();
    }

    expect(body.edges.length).toBeGreaterThanOrEqual(expected.edges.length);
  });
});
