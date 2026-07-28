import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { pythonGrpcCallsIngestAdapter } from '../../src/services/ingest/adapters/grpc-calls.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/python-http-grpc-demo');

describe('python-grpc-calls binds', () => {
  it('emits grpc protocol http_calls from fixture client', () => {
    const outputPath = '/tmp/ods-python-grpc-calls-envelope.json';
    runParserCli({
      parserId: 'python-grpc-calls',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: ['grpc_client/client.py'],
      outputPath,
      install: false,
    });

    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      model: {
        calls: Array<{ target_service: string; target_method: string }>;
      };
    };
    expect(envelope.model.calls.length).toBeGreaterThanOrEqual(1);
    expect(envelope.model.calls[0]?.target_method).toBe('GetOrder');

    const ingested = pythonGrpcCallsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'python-grpc-calls',
      schema_version: '1',
      files_analyzed: [],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(
      ingested.edges.filter((e) => e.type === 'http_calls' && e.metadata?.protocol === 'grpc')
        .length,
    ).toBeGreaterThanOrEqual(1);
  });
});
