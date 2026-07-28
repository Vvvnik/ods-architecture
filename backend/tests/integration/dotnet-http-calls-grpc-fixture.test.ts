import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dotnetHttpCallsIngestAdapter } from '../../src/services/ingest/adapters/dotnet-http-calls.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('dotnet-http-calls parser + ingest', () => {
  it('extracts calls from grpc-multistack fixture', () => {
    const outputPath = '/tmp/ods-dotnet-http-envelope.json';
    runParserCli({
      parserId: 'dotnet-http-calls',
      entry: 'run.sh',
      workingCopyRoot: `${process.cwd()}/../docker/fixtures/repos/grpc-multistack-demo`,
      files: ['dotnet-http/OrdersHttpClient.cs'],
      outputPath,
      install: false,
    });
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      model: { calls: Array<{ method: string; path: string }> };
    };
    expect(envelope.parser_id).toBe('dotnet-http-calls');
    expect(envelope.model.calls.length).toBeGreaterThan(0);
    const ingested = dotnetHttpCallsIngestAdapter.transform(
      {
        calls: envelope.model.calls.map((call) => ({
          ...call,
          source_path: 'orders-service/clients/OrdersHttpClient.cs',
          service_hint: 'orders-service',
          callee_service_hint: 'backend',
          client_kind: 'httpclient',
        })),
      },
      {
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'dotnet-http-calls',
        schema_version: '1',
        files_analyzed: [],
        incremental: false,
        affected_paths: [],
        deleted_paths: [],
      },
    );
    expect(ingested.edges.some((edge) => edge.type === 'http_calls')).toBe(true);
  });
});
