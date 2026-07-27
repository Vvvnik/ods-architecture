import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

describe('typescript parser calls (008)', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-ts-calls-'));
    outputPath = join(repoRoot, 'envelope.json');
    cpSync(join(process.cwd(), '../docker/fixtures/repos/code-graph-depth-demo/typescript'), repoRoot, {
      recursive: true,
    });

    const parser = join(process.cwd(), '../parsers/typescript/run.mjs');
    execFileSync(
      process.execPath,
      [
        parser,
        '--project-id',
        '00000000-0000-4000-8000-000000000041',
        '--working-copy-root',
        repoRoot,
        '--analysis-run-id',
        '00000000-0000-4000-8000-000000000042',
        '--files',
        JSON.stringify(['create.ts', 'save.ts']),
        '--output',
        outputPath,
      ],
      { stdio: 'pipe' },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('emits schema_version 2 with cross-file calls', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      schema_version: string;
      model: { usages?: Array<{ type: string; from: string; to: string }> };
    };

    expect(envelope.schema_version).toBe('2');
    const usages = envelope.model.usages ?? [];
    expect(usages.some((u) => u.type === 'calls' && u.from === 'create' && u.to === 'save')).toBe(true);
  });

  it.skipIf(!esAvailable)('ingests calls edge into elasticsearch', async () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8'));
    const projectId = '00000000-0000-4000-8000-000000000051';
    const runId = '00000000-0000-4000-8000-000000000052';

    process.env.ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200';
    const esClient = createElasticsearchClient({
      ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
    } as ReturnType<typeof import('../../src/config.js').loadConfig>);

    await bootstrapIndices(esClient);
    const analysisRunRepository = new AnalysisRunRepository(esClient);
    const parserEnvelopeRepository = new ParserEnvelopeRepository(esClient);
    const graphNodeRepository = new GraphNodeRepository(esClient);
    const graphEdgeRepository = new GraphEdgeRepository(esClient);
    const elementRepository = new ElementRepository(esClient);
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
      language_report_id: '00000000-0000-4000-8000-000000000053',
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

    await ingestService.ingestNative({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelope.parser_id,
      schema_version: envelope.schema_version,
      generated_at: envelope.generated_at,
      files_analyzed: envelope.files_analyzed,
      model: envelope.model,
    });

    await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelope.parser_id,
      schema_version: envelope.schema_version,
      generated_at: envelope.generated_at,
      files_analyzed: envelope.files_analyzed,
    });
    await ingestService.completeRun(runId);

    const edges = await graphEdgeRepository.search(projectId, runId, 'calls', {
      limit: 100,
      offset: 0,
    });
    expect(edges.items.some((edge) => edge.type === 'calls')).toBe(true);

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
  });
});
