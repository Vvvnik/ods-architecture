import { describe, expect, it } from 'vitest';
import { grpcProtoIngestAdapter } from '../../../src/services/ingest/adapters/grpc-proto.ingest.js';

const ctx = {
  project_id: 'p',
  analysis_run_id: 'r',
  parser_id: 'grpc-proto',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('grpc-proto ingest', () => {
  it('emits grpc_method nodes and documents edges', () => {
    const result = grpcProtoIngestAdapter.transform(
      {
        services: [
          {
            package: 'demo.v1',
            name: 'OrdersService',
            source_path: 'proto/demo/v1/orders.proto',
            methods: [{ name: 'GetOrder' }],
          },
        ],
      },
      ctx,
    );
    expect(result.nodes.some((node) => node.kind === 'grpc_method')).toBe(true);
    expect(result.edges.some((edge) => edge.type === 'documents')).toBe(true);
    expect(result.nodes.find((node) => node.kind === 'grpc_method')?.metadata?.protocol).toBe('grpc');
  });

  it('returns empty result for invalid model', () => {
    const result = grpcProtoIngestAdapter.transform({ services: [{}] }, ctx);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
