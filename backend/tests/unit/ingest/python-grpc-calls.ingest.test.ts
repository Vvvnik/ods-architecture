import { describe, expect, it } from 'vitest';

import { pythonGrpcCallsIngestAdapter } from '../../../src/services/ingest/adapters/grpc-calls.ingest.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'python-grpc-calls',
  schema_version: '1',
  files_analyzed: ['grpc_client/client.py'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('python-grpc-calls.ingest', () => {
  it('creates http_calls with protocol=grpc', () => {
    const result = pythonGrpcCallsIngestAdapter.transform(
      {
        calls: [
          {
            target_service: 'demo.v1.OrdersService',
            target_method: 'GetOrder',
            source_path: 'grpc_client/client.py',
            service_hint: 'grpc_client',
          },
        ],
      },
      ctx,
    );

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.type).toBe('http_calls');
    expect(result.edges[0]?.metadata?.protocol).toBe('grpc');
    expect(result.edges[0]?.to).toContain('grpc_method');
  });

  it('skips calls without caller service resolve', () => {
    const result = pythonGrpcCallsIngestAdapter.transform(
      {
        calls: [
          {
            target_service: 'demo.v1.OrdersService',
            target_method: 'GetOrder',
            source_path: 'orphan.py',
          },
        ],
      },
      ctx,
    );
    expect(result.edges).toHaveLength(0);
  });
});
