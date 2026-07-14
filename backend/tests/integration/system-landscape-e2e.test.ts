import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appsettingsIngestAdapter } from '../../src/services/ingest/adapters/appsettings.ingest.js';
import { busRabbitIngestAdapter } from '../../src/services/ingest/adapters/bus-rabbit.ingest.js';
import { composeIngestAdapter } from '../../src/services/ingest/adapters/compose.ingest.js';
import { dotnetProjectIngestAdapter } from '../../src/services/ingest/adapters/dotnet-project.ingest.js';
import { openapiIngestAdapter } from '../../src/services/ingest/adapters/openapi.ingest.js';
import type { IngestTransformResult } from '../../src/services/ingest/types.js';
import { runParserCli } from '../helpers/parser-cli.js';

interface ExpectedLink {
  type: string;
  from_service?: string;
  to_service?: string;
  method?: string;
  path?: string;
  name?: string;
  from?: string;
  to?: string;
  from_project?: string;
  to_project?: string;
}

const FIXTURE_ROOT = join(process.cwd(), '../docker/fixtures/repos/system-landscape-demo');
const EXPECTED_LINKS_PATH = join(
  process.cwd(),
  'tests/fixtures/system-landscape/expected-links.json',
);

function nodeNameById(nodes: IngestTransformResult['nodes'], nodeId: string): string | undefined {
  return nodes.find((node) => node.id === nodeId)?.name;
}

function matchesExpectedLink(
  link: ExpectedLink,
  nodes: IngestTransformResult['nodes'],
  edges: IngestTransformResult['edges'],
): boolean {
  switch (link.type) {
    case 'depends_on':
      return edges.some(
        (edge) =>
          edge.type === 'depends_on' &&
          nodeNameById(nodes, edge.from) === link.from_service &&
          nodeNameById(nodes, edge.to) === link.to_service,
      );
    case 'http_endpoint':
      return nodes.some(
        (node) =>
          node.kind === 'http_endpoint' &&
          node.signature === link.method &&
          node.name === link.path,
      );
    case 'database':
      return nodes.some((node) => node.kind === 'database' && node.name === link.name);
    case 'broker':
      return nodes.some((node) => node.kind === 'broker' && node.name === link.name);
    case 'connects_to':
      return edges.some(
        (edge) =>
          edge.type === 'connects_to' &&
          nodeNameById(nodes, edge.from) === link.from &&
          nodeNameById(nodes, edge.to) === link.to,
      );
    case 'project_reference':
      return edges.some(
        (edge) =>
          edge.type === 'project_reference' &&
          nodeNameById(nodes, edge.from) === link.from_project &&
          nodeNameById(nodes, edge.to) === link.to_project,
      );
    case 'consumes':
      return edges.some(
        (edge) =>
          edge.type === 'consumes' &&
          nodeNameById(nodes, edge.from) === link.from &&
          nodeNameById(nodes, edge.to) === link.to,
      );
    default:
      return false;
  }
}

function mergeIngestResults(results: IngestTransformResult[]): IngestTransformResult {
  return {
    nodes: results.flatMap((result) => result.nodes),
    edges: results.flatMap((result) => result.edges),
  };
}

describe('system landscape demo e2e (parser CLI + ingest)', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'ods-system-landscape-e2e-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('builds SC-001 graph and matches SC-004 golden links', () => {
    const ctx = {
      project_id: 'p-demo',
      analysis_run_id: 'r-demo',
      schema_version: '1' as const,
      incremental: false,
      affected_paths: [] as string[],
      deleted_paths: [] as string[],
    };

    const composeEnvelopePath = join(workDir, 'compose.json');
    runParserCli({
      parserId: 'compose',
      workingCopyRoot: FIXTURE_ROOT,
      files: ['docker-compose.yml'],
      outputPath: composeEnvelopePath,
    });
    const composeEnvelope = JSON.parse(readFileSync(composeEnvelopePath, 'utf8'));

    const openapiEnvelopePath = join(workDir, 'openapi.json');
    runParserCli({
      parserId: 'openapi',
      workingCopyRoot: FIXTURE_ROOT,
      files: ['contracts/openapi.yaml'],
      outputPath: openapiEnvelopePath,
    });
    const openapiEnvelope = JSON.parse(readFileSync(openapiEnvelopePath, 'utf8'));

    const appsettingsEnvelopePath = join(workDir, 'appsettings.json');
    runParserCli({
      parserId: 'appsettings',
      workingCopyRoot: FIXTURE_ROOT,
      files: ['src/Api/appsettings.json'],
      outputPath: appsettingsEnvelopePath,
      install: false,
    });
    const appsettingsEnvelope = JSON.parse(readFileSync(appsettingsEnvelopePath, 'utf8'));

    const dotnetEnvelopePath = join(workDir, 'dotnet-project.json');
    runParserCli({
      parserId: 'dotnet-project',
      workingCopyRoot: FIXTURE_ROOT,
      files: [
        'system-landscape.sln',
        'src/Api/Api.csproj',
        'src/Worker/Worker.csproj',
        'src/Contracts/Contracts.csproj',
      ],
      outputPath: dotnetEnvelopePath,
      install: false,
    });
    const dotnetEnvelope = JSON.parse(readFileSync(dotnetEnvelopePath, 'utf8'));

    const busEnvelopePath = join(workDir, 'bus-rabbit.json');
    runParserCli({
      parserId: 'bus-rabbit',
      workingCopyRoot: FIXTURE_ROOT,
      files: ['src/Worker/OrderCreatedListener.cs', 'src/Worker/Worker.csproj'],
      outputPath: busEnvelopePath,
      install: false,
    });
    const busEnvelope = JSON.parse(readFileSync(busEnvelopePath, 'utf8'));

    const merged = mergeIngestResults([
      composeIngestAdapter.transform(composeEnvelope.model, {
        ...ctx,
        parser_id: 'compose',
        files_analyzed: ['docker-compose.yml'],
      }),
      openapiIngestAdapter.transform(openapiEnvelope.model, {
        ...ctx,
        parser_id: 'openapi',
        files_analyzed: ['contracts/openapi.yaml'],
      }),
      appsettingsIngestAdapter.transform(appsettingsEnvelope.model, {
        ...ctx,
        parser_id: 'appsettings',
        files_analyzed: ['src/Api/appsettings.json'],
      }),
      dotnetProjectIngestAdapter.transform(dotnetEnvelope.model, {
        ...ctx,
        parser_id: 'dotnet-project',
        files_analyzed: dotnetEnvelope.files_analyzed,
      }),
      busRabbitIngestAdapter.transform(busEnvelope.model, {
        ...ctx,
        parser_id: 'bus-rabbit',
        files_analyzed: busEnvelope.files_analyzed,
      }),
    ]);

    const systemNodes = merged.nodes.filter((node) => node.metadata?.layer === 'system');
    const systemEdges = merged.edges.filter((edge) => edge.metadata?.layer === 'system');

    expect(systemNodes.length).toBeGreaterThanOrEqual(10);
    expect(systemEdges.length).toBeGreaterThanOrEqual(8);

    const expectedLinks = JSON.parse(readFileSync(EXPECTED_LINKS_PATH, 'utf8')) as ExpectedLink[];
    const matched = expectedLinks.filter((link) => matchesExpectedLink(link, merged.nodes, merged.edges));
    const ratio = matched.length / expectedLinks.length;

    expect(ratio).toBeGreaterThanOrEqual(0.9);
  });
});
