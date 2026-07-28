import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { pythonHttpCallsIngestAdapter } from '../../src/services/ingest/adapters/python-http-calls.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/python-http-grpc-demo');

describe('python-http-calls binds', () => {
  it('emits http_calls for httpx, requests, and aiohttp', () => {
    const outputPath = '/tmp/ods-python-http-calls-envelope.json';
    runParserCli({
      parserId: 'python-http-calls',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: [
        'http_clients/client_httpx.py',
        'http_clients/client_requests.py',
        'http_clients/client_aiohttp.py',
      ],
      outputPath,
      install: false,
    });

    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      model: { calls: Array<{ client_kind?: string }> };
    };
    const kinds = new Set(envelope.model.calls.map((c) => c.client_kind));
    expect(kinds.has('httpx')).toBe(true);
    expect(kinds.has('requests')).toBe(true);
    expect(kinds.has('aiohttp')).toBe(true);

    const ingested = pythonHttpCallsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'python-http-calls',
      schema_version: '1',
      files_analyzed: [],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    const byKind = (k: string) =>
      ingested.edges.filter((e) => e.type === 'http_calls' && e.metadata?.client_kind === k);
    expect(byKind('httpx').length).toBeGreaterThanOrEqual(1);
    expect(byKind('requests').length).toBeGreaterThanOrEqual(1);
    expect(byKind('aiohttp').length).toBeGreaterThanOrEqual(1);
  });
});
