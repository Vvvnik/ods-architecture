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
import { SyncSnapshotRepository } from '../../src/repositories/sync-snapshot.repository.js';
import { ChangeSetService } from '../../src/services/change-set.service.js';
import { typescriptIngestAdapter } from '../../src/services/ingest/adapters/typescript.ingest.js';
import { IngestRegistryService } from '../../src/services/ingest/ingest-registry.service.js';
import { IngestService } from '../../src/services/ingest/ingest.service.js';
import { ParserRegistryService } from '../../src/services/parser-registry.service.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!esAvailable)('graph incremental ingest integration', () => {
  const projectId = '00000000-0000-4000-8000-000000000020';
  const fullRunId = '00000000-0000-4000-8000-000000000021';
  const incrementalRunId = '00000000-0000-4000-8000-000000000022';

  let esClient: ReturnType<typeof createElasticsearchClient>;
  let ingestService: IngestService;
  let graphNodeRepository: GraphNodeRepository;
  let parserEnvelopeRepository: ParserEnvelopeRepository;
  let analysisRunRepository: AnalysisRunRepository;

  beforeEach(async () => {
    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    process.env.PARSERS_ROOT = join(process.cwd(), '../parsers');

    esClient = createElasticsearchClient({
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
      PARSERS_ROOT: process.env.PARSERS_ROOT,
    } as ReturnType<typeof import('../../src/config.js').loadConfig>);

    await bootstrapIndices(esClient);

    analysisRunRepository = new AnalysisRunRepository(esClient);
    parserEnvelopeRepository = new ParserEnvelopeRepository(esClient);
    graphNodeRepository = new GraphNodeRepository(esClient);
    const graphEdgeRepository = new GraphEdgeRepository(esClient);
    const elementRepository = new ElementRepository(esClient);
    const syncSnapshotRepository = new SyncSnapshotRepository(esClient);
    const changeSetService = new ChangeSetService(
      {
        ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
      } as ReturnType<typeof import('../../src/config.js').loadConfig>,
      syncSnapshotRepository,
      analysisRunRepository,
    );
    const parserRegistry = new ParserRegistryService({
      PARSERS_ROOT: process.env.PARSERS_ROOT,
    } as ReturnType<typeof import('../../src/config.js').loadConfig>);
    await parserRegistry.load();

    const ingestRegistry = new IngestRegistryService();
    ingestRegistry.register(typescriptIngestAdapter);

    ingestService = new IngestService(
      parserEnvelopeRepository,
      analysisRunRepository,
      graphNodeRepository,
      graphEdgeRepository,
      elementRepository,
      ingestRegistry,
      undefined,
      changeSetService,
      parserRegistry,
    );

    await analysisRunRepository.create({
      id: fullRunId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000023',
      status: 'success',
      started_at: '2026-01-01T00:00:00.000Z',
      completed_at: '2026-01-01T00:00:01.000Z',
      incremental: false,
      change_set: {
        project_id: projectId,
        incremental: false,
        added: ['src/main.ts', 'lib/util.ts'],
        modified: [],
        deleted: [],
      },
      parser_results: [{ parser_id: 'typescript', status: 'success', error_message: null }],
      last_error_message: null,
      ingest_status: 'success',
      ingest_completed_at: '2026-01-01T00:00:02.000Z',
    });

    const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/envelope-typescript-v1.json');
    const fullEnvelope = JSON.parse(await readFile(fixturePath, 'utf8'));

    await ingestService.ingestNative({
      project_id: projectId,
      analysis_run_id: fullRunId,
      parser_id: fullEnvelope.parser_id,
      schema_version: fullEnvelope.schema_version,
      generated_at: fullEnvelope.generated_at,
      files_analyzed: fullEnvelope.files_analyzed,
      model: fullEnvelope.model,
    });

    await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: fullRunId,
      parser_id: fullEnvelope.parser_id,
      schema_version: fullEnvelope.schema_version,
      generated_at: fullEnvelope.generated_at,
      files_analyzed: fullEnvelope.files_analyzed,
    });
    await ingestService.completeRun(fullRunId);

    await analysisRunRepository.create({
      id: incrementalRunId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000023',
      status: 'success',
      started_at: '2026-01-02T00:00:00.000Z',
      completed_at: '2026-01-02T00:00:01.000Z',
      incremental: true,
      change_set: {
        project_id: projectId,
        incremental: true,
        added: [],
        modified: ['src/main.ts'],
        deleted: [],
      },
      parser_results: [{ parser_id: 'typescript', status: 'success', error_message: null }],
      last_error_message: null,
    });

    const incrementalModel = {
      symbols: [
        {
          name: 'mainRenamed',
          kind: 'function',
          path: 'src/main.ts',
          qualified_name: 'mainRenamed',
          location: {
            start_line: 1,
            start_col: 0,
            end_line: 1,
            end_col: 30,
          },
          refs: [
            {
              type: 'imports',
              name: 'util',
              kind: 'function',
              path: 'lib/util.ts',
              qualified_name: 'util',
            },
          ],
        },
      ],
    };

    await ingestService.ingestNative({
      project_id: projectId,
      analysis_run_id: incrementalRunId,
      parser_id: 'typescript',
      schema_version: '1',
      generated_at: '2026-01-02T00:00:00.000Z',
      files_analyzed: ['src/main.ts'],
      model: incrementalModel,
    });

    await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: incrementalRunId,
      parser_id: 'typescript',
      schema_version: '1',
      generated_at: '2026-01-02T00:00:00.000Z',
      files_analyzed: ['src/main.ts'],
    });
    await ingestService.completeRun(incrementalRunId);
  });

  afterEach(async () => {
    for (const index of [GRAPH_NODES_INDEX, GRAPH_EDGES_INDEX, 'ods-analysis-runs', 'ods-parser-envelopes']) {
      await esClient.deleteByQuery({
        index,
        refresh: true,
        query: { term: { project_id: projectId } },
      });
    }
  });

  it('keeps unchanged file nodes and updates only the modified path', async () => {
    const fullRunNodes = await graphNodeRepository.countByProjectAndRun(projectId, fullRunId);
    const incrementalNodes = await graphNodeRepository.countByProjectAndRun(
      projectId,
      incrementalRunId,
    );

    expect(fullRunNodes).toBe(2);
    expect(incrementalNodes).toBe(2);

    const utilNodes = await graphNodeRepository.listByProjectAndRun(projectId, incrementalRunId, {
      path: 'lib/util.ts',
    });
    expect(utilNodes.items.some((node) => node.name === 'util')).toBe(true);

    const mainNodes = await graphNodeRepository.listByProjectAndRun(projectId, incrementalRunId, {
      path: 'src/main.ts',
    });
    expect(mainNodes.items.some((node) => node.name === 'mainRenamed')).toBe(true);
    expect(mainNodes.items.some((node) => node.name === 'main')).toBe(false);
  });

  it('bootstraps from the latest non-empty run when intermediate runs have no nodes', async () => {
    const skippedRunId = '00000000-0000-4000-8000-000000000025';
    const addRunId = '00000000-0000-4000-8000-000000000026';

    await analysisRunRepository.create({
      id: skippedRunId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000023',
      status: 'success',
      started_at: '2026-01-04T00:00:00.000Z',
      completed_at: '2026-01-04T00:00:01.000Z',
      incremental: true,
      change_set: {
        project_id: projectId,
        incremental: true,
        added: [],
        modified: [],
        deleted: [],
      },
      parser_results: [{ parser_id: 'typescript', status: 'skipped', error_message: null }],
      last_error_message: null,
      ingest_status: 'success',
      ingest_completed_at: '2026-01-04T00:00:02.000Z',
    });

    await analysisRunRepository.create({
      id: addRunId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000023',
      status: 'success',
      started_at: '2026-01-05T00:00:00.000Z',
      completed_at: '2026-01-05T00:00:01.000Z',
      incremental: true,
      change_set: {
        project_id: projectId,
        incremental: true,
        added: ['src/new.ts'],
        modified: [],
        deleted: [],
      },
      parser_results: [{ parser_id: 'typescript', status: 'success', error_message: null }],
      last_error_message: null,
    });

    await ingestService.ingestNative({
      project_id: projectId,
      analysis_run_id: addRunId,
      parser_id: 'typescript',
      schema_version: '1',
      generated_at: '2026-01-05T00:00:00.000Z',
      files_analyzed: ['src/new.ts'],
      model: {
        symbols: [
          {
            name: 'newFn',
            kind: 'function',
            path: 'src/new.ts',
            qualified_name: 'newFn',
            location: { start_line: 1, start_col: 0, end_line: 1, end_col: 10 },
            refs: [],
          },
        ],
      },
    });

    await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: addRunId,
      parser_id: 'typescript',
      schema_version: '1',
      generated_at: '2026-01-05T00:00:00.000Z',
      files_analyzed: ['src/new.ts'],
    });
    await ingestService.completeRun(addRunId);

    const addRunNodes = await graphNodeRepository.countByProjectAndRun(projectId, addRunId);
    expect(addRunNodes).toBe(3);

    const newNodes = await graphNodeRepository.listByProjectAndRun(projectId, addRunId, {
      path: 'src/new.ts',
    });
    expect(newNodes.items.some((node) => node.name === 'newFn')).toBe(true);
  });

  it('removes graph canon for deleted paths without transform', async () => {
    const deleteRunId = '00000000-0000-4000-8000-000000000024';

    await analysisRunRepository.create({
      id: deleteRunId,
      project_id: projectId,
      language_report_id: '00000000-0000-4000-8000-000000000023',
      status: 'success',
      started_at: '2026-01-03T00:00:00.000Z',
      completed_at: '2026-01-03T00:00:01.000Z',
      incremental: true,
      change_set: {
        project_id: projectId,
        incremental: true,
        added: [],
        modified: [],
        deleted: ['lib/util.ts'],
      },
      parser_results: [{ parser_id: 'typescript', status: 'skipped', error_message: null }],
      last_error_message: null,
    });

    await ingestService.ingestDeletedPaths(projectId, deleteRunId, 'typescript', ['lib/util.ts']);
    await ingestService.completeRun(deleteRunId);

    const utilNodes = await graphNodeRepository.listByProjectAndRun(projectId, deleteRunId, {
      path: 'lib/util.ts',
    });
    expect(utilNodes.total).toBe(0);

    const mainNodes = await graphNodeRepository.listByProjectAndRun(projectId, deleteRunId, {
      path: 'src/main.ts',
    });
    expect(mainNodes.total).toBeGreaterThan(0);
  });
});
