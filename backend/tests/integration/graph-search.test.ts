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

describe.skipIf(!esAvailable)('graph search integration (T026)', () => {
  const projectId = '00000000-0000-4000-8000-000000000030';
  const runId = '00000000-0000-4000-8000-000000000031';

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
      name: 'graph-search fixture',
      source_type: 'local_path',
      source_value: '/tmp/graph-search-fixture',
      working_copy_root: '/tmp/graph-search-fixture',
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
      parser_results: [],
      last_error_message: null,
    });

    const envelopePath = join(process.cwd(), 'tests/fixtures/ingest/envelope-typescript-v1.json');
    const envelopeFixture = JSON.parse(await readFile(envelopePath, 'utf8'));

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
    await esClient
      .delete({
        index: PROJECTS_INDEX,
        id: projectId,
        refresh: true,
      })
      .catch(() => undefined);
  });

  it('returns known fixture name on first search page', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/search?q=main&limit=50&offset=0`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as {
      q: string;
      nodes: { items: Array<{ name: string }>; total: number };
      edges: { items: unknown[]; total: number };
    };
    expect(body.q).toBe('main');
    expect(body.nodes.total).toBeGreaterThan(0);
    expect(body.nodes.items.some((node) => node.name === 'main')).toBe(true);
  });

  it('rejects short query with Russian message', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/projects/${projectId}/graph/search?q=a`,
    });
    expect(response.statusCode).toBe(400);
    const body = response.json() as { message?: string };
    expect(body.message).toMatch(/2/);
  });
});
