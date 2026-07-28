import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  dotnetGrpcCallsIngestAdapter,
  javaGrpcCallsIngestAdapter,
  tsGrpcCallsIngestAdapter,
} from '../../src/services/ingest/adapters/grpc-calls.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

const fixtureRoot = `${process.cwd()}/../docker/fixtures/repos/grpc-multistack-demo`;
const baseCtx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('grpc client binds ingest', () => {
  it('creates grpc http_calls edges for ts/java/dotnet parser outputs', () => {
    runParserCli({
      parserId: 'ts-grpc-calls',
      entry: 'run.mjs',
      workingCopyRoot: fixtureRoot,
      files: ['ts-client/src/orders.ts'],
      outputPath: '/tmp/ods-ts-grpc-envelope.json',
      install: false,
    });
    runParserCli({
      parserId: 'java-grpc-calls',
      entry: 'run.mjs',
      workingCopyRoot: fixtureRoot,
      files: ['java-client/src/main/java/local/ods/grpc/OrdersClient.java'],
      outputPath: '/tmp/ods-java-grpc-envelope.json',
      install: false,
    });
    runParserCli({
      parserId: 'dotnet-grpc-calls',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: ['dotnet-client/OrdersClient.cs'],
      outputPath: '/tmp/ods-dotnet-grpc-envelope.json',
      install: false,
    });

    const ts = JSON.parse(readFileSync('/tmp/ods-ts-grpc-envelope.json', 'utf8'));
    const java = JSON.parse(readFileSync('/tmp/ods-java-grpc-envelope.json', 'utf8'));
    const dotnet = JSON.parse(readFileSync('/tmp/ods-dotnet-grpc-envelope.json', 'utf8'));

    const tsEdges = tsGrpcCallsIngestAdapter.transform(ts.model, { ...baseCtx, parser_id: 'ts-grpc-calls' }).edges;
    const javaEdges = javaGrpcCallsIngestAdapter.transform(java.model, { ...baseCtx, parser_id: 'java-grpc-calls' }).edges;
    const dotnetEdges = dotnetGrpcCallsIngestAdapter.transform(dotnet.model, { ...baseCtx, parser_id: 'dotnet-grpc-calls' }).edges;

    expect(tsEdges.length).toBeGreaterThan(0);
    expect(javaEdges.length).toBeGreaterThan(0);
    expect(dotnetEdges.length).toBeGreaterThan(0);
    expect(tsEdges.every((edge) => edge.metadata?.protocol === 'grpc')).toBe(true);
    expect(javaEdges.every((edge) => edge.metadata?.protocol === 'grpc')).toBe(true);
    expect(dotnetEdges.every((edge) => edge.metadata?.protocol === 'grpc')).toBe(true);
  });
});
