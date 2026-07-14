import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { openapiIngestAdapter } from '../../src/services/ingest/adapters/openapi.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('openapi parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-openapi-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    const openApiPath = join(repoRoot, 'contracts/openapi.yaml');
    mkdirSync(join(repoRoot, 'contracts'), { recursive: true });
    writeFileSync(
      openApiPath,
      `openapi: 3.0.3
info:
  title: Demo API
  version: 1.0.0
paths:
  /api/v1/health:
    get:
      operationId: getHealth
      responses:
        '200':
          description: OK
  /api/v1/orders:
    post:
      operationId: createOrder
      responses:
        '201':
          description: Created
`,
      'utf8',
    );

    runParserCli({
      parserId: 'openapi',
      entry: 'run.mjs',
      workingCopyRoot: repoRoot,
      files: ['contracts/openapi.yaml'],
      outputPath,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes openapi envelope and ingests http_endpoint + documents', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      model: { specs: Array<{ endpoints: Array<{ method: string; path: string }> }> };
    };

    expect(envelope.parser_id).toBe('openapi');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.model.specs[0]?.endpoints).toHaveLength(2);

    const ingested = openapiIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'openapi',
      schema_version: '1',
      files_analyzed: ['contracts/openapi.yaml'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.some((node) => node.kind === 'http_endpoint')).toBe(true);
    expect(ingested.edges.some((edge) => edge.type === 'documents')).toBe(true);
  });
});
