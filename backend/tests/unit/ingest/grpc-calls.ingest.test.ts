import { describe, expect, it } from 'vitest';
import {
  dotnetGrpcCallsIngestAdapter,
  javaGrpcCallsIngestAdapter,
  tsGrpcCallsIngestAdapter,
} from '../../../src/services/ingest/adapters/grpc-calls.ingest.js';

const ctx = {
  project_id: 'p',
  analysis_run_id: 'r',
  parser_id: 'ts-grpc-calls',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('grpc-calls ingest', () => {
  it('emits grpc http_calls edge for valid call', () => {
    const result = tsGrpcCallsIngestAdapter.transform(
      {
        calls: [
          {
            source_path: 'customers/src/client.ts',
            service_hint: 'customers',
            method: 'demo.v1.OrdersService/GetOrder',
          },
        ],
      },
      ctx,
    );
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].type).toBe('http_calls');
    expect(result.edges[0].metadata?.protocol).toBe('grpc');
  });

  it('skips unresolved caller service', () => {
    const result = javaGrpcCallsIngestAdapter.transform(
      { calls: [{ source_path: 'A.java', method: 'demo.v1.OrdersService/GetOrder' }] },
      { ...ctx, parser_id: 'java-grpc-calls' },
    );
    expect(result.edges).toHaveLength(0);
  });

  it('accepts dotnet parser variant', () => {
    const result = dotnetGrpcCallsIngestAdapter.transform(
      {
        calls: [
          {
            source_path: 'orders-service/Client.cs',
            service_hint: 'orders-service',
            method: 'demo.v1.OrdersService/GetOrder',
          },
        ],
      },
      { ...ctx, parser_id: 'dotnet-grpc-calls' },
    );
    expect(result.edges[0].metadata?.protocol).toBe('grpc');
  });
});
