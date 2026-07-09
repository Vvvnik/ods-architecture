import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  bootstrapIndices,
  createElasticsearchClient,
  GRAPH_EDGES_INDEX,
  GRAPH_NODES_INDEX,
} from '../../src/infra/elasticsearch.js';
import { AnalysisRunRepository } from '../../src/repositories/analysis-run.repository.js';
import { ElementRepository } from '../../src/repositories/element.repository.js';
import { GraphEdgeRepository } from '../../src/repositories/graph-edge.repository.js';
import { GraphNodeRepository } from '../../src/repositories/graph-node.repository.js';
import { ParserEnvelopeRepository } from '../../src/repositories/parser-envelope.repository.js';
import { typescriptIngestAdapter } from '../../src/services/ingest/adapters/typescript.ingest.js';
import { IngestRegistryService } from '../../src/services/ingest/ingest-registry.service.js';
import { IngestService } from '../../src/services/ingest/ingest.service.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('graph ingest integration', () => {
  const projectId = '00000000-0000-4000-8000-000000000010';
  const runId = '00000000-0000-4000-8000-000000000011';

  let esClient: ReturnType<typeof createElasticsearchClient>;
  let ingestService: IngestService;
  let graphNodeRepository: GraphNodeRepository;
  let graphEdgeRepository: GraphEdgeRepository;

  beforeEach(async () => {
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    esClient = createElasticsearchClient({
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
    } as ReturnType<typeof import('../../src/config.js').loadConfig>);

    await bootstrapIndices(esClient);

    const analysisRunRepository = new AnalysisRunRepository(esClient);
    const parserEnvelopeRepository = new ParserEnvelopeRepository(esClient);
    graphNodeRepository = new GraphNodeRepository(esClient);
    graphEdgeRepository = new GraphEdgeRepository(esClient);
    const elementRepository = new ElementRepository(esClient);

    const ingestRegistry = new IngestRegistryService();
    ingestRegistry.register(typescriptIngestAdapter);

    ingestService = new IngestService(
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
      language_report_id: '00000000-0000-4000-8000-000000000012',
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
  });

  it('writes graph nodes and edges to elasticsearch', async () => {
    const nodeCount = await graphNodeRepository.countByProjectAndRun(projectId, runId);
    const edgeCount = await graphEdgeRepository.countByProjectAndRun(projectId, runId);

    expect(nodeCount).toBe(2);
    expect(edgeCount).toBe(1);
  });
});
