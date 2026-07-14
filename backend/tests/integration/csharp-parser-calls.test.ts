import { execSync } from 'node:child_process';
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
import { csharpIngestAdapter } from '../../src/services/ingest/adapters/csharp.ingest.js';
import { IngestRegistryService } from '../../src/services/ingest/ingest-registry.service.js';
import { IngestService } from '../../src/services/ingest/ingest.service.js';
import { isElasticsearchAvailable } from '../helpers/test-utils.js';

function dotnetAvailable(): boolean {
  try {
    execSync('dotnet --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const dotnetOk = dotnetAvailable();
const esAvailable = await isElasticsearchAvailable();

describe.skipIf(!dotnetOk)('csharp parser calls (008)', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-csharp-calls-'));
    outputPath = join(repoRoot, 'envelope.json');
    const fixtureSrc = join(process.cwd(), '../docker/fixtures/repos/code-graph-depth-demo/csharp');
    cpSync(fixtureSrc, repoRoot, { recursive: true });

    const parserRoot = join(process.cwd(), '../parsers/csharp');
    execSync(`chmod +x "${join(parserRoot, 'run.sh')}"`);
    execSync(`dotnet build -c Release`, {
      cwd: join(parserRoot, 'Ods.CSharpParser'),
      stdio: 'pipe',
    });

    execSync(
      `"${join(parserRoot, 'run.sh')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000021 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000022 ' +
        `--files '["Service.cs","Repo.cs"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe', env: { ...process.env, DOTNET_ROLL_FORWARD: 'LatestMajor' } },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('emits schema_version 2 with cross-file calls and injects', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      schema_version: string;
      model: {
        symbols: Array<{ qualified_name: string }>;
        usages?: Array<{ type: string; from: string; to: string }>;
      };
    };

    expect(envelope.schema_version).toBe('2');
    const usages = envelope.model.usages ?? [];
    expect(usages.some((u) => u.type === 'calls' && u.from.includes('Create') && u.to.includes('Save'))).toBe(
      true,
    );
    expect(usages.some((u) => u.type === 'injects' && u.from.includes('Service') && u.to.includes('Repo'))).toBe(
      true,
    );
  });

  it.skipIf(!esAvailable)('ingests calls edge into elasticsearch', async () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8'));
    const projectId = '00000000-0000-4000-8000-000000000031';
    const runId = '00000000-0000-4000-8000-000000000032';

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
    ingestRegistry.register(csharpIngestAdapter);
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
      language_report_id: '00000000-0000-4000-8000-000000000033',
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

    const saved = await parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: runId,
      parser_id: envelope.parser_id,
      schema_version: envelope.schema_version,
      generated_at: envelope.generated_at,
      files_analyzed: envelope.files_analyzed,
      model: envelope.model,
    });

    await ingestService.ingestEnvelope(saved.id);
    await ingestService.completeRun(runId);

    const callEdges = await graphEdgeRepository.search(projectId, runId, 'calls', {
      limit: 100,
      offset: 0,
    });
    const injectEdges = await graphEdgeRepository.search(projectId, runId, 'injects', {
      limit: 100,
      offset: 0,
    });
    expect(callEdges.items.some((edge) => edge.type === 'calls')).toBe(true);
    expect(injectEdges.items.some((edge) => edge.type === 'injects')).toBe(true);

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
