import { describe, expect, it } from 'vitest';
import { busRabbitIngestAdapter } from '../../../src/services/ingest/adapters/bus-rabbit.ingest.js';
import { grpcProtoIngestAdapter } from '../../../src/services/ingest/adapters/grpc-proto.ingest.js';

const baseCtx = {
  project_id: 'p',
  analysis_run_id: 'r',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('grpc and rpc_handles separation', () => {
  it('grpc adapters do not emit rpc_handles edges', () => {
    const result = grpcProtoIngestAdapter.transform(
      {
        services: [
          { package: 'demo.v1', name: 'OrdersService', source_path: 'proto/orders.proto', methods: [{ name: 'Get' }] },
        ],
      },
      { ...baseCtx, parser_id: 'grpc-proto' },
    );
    expect(result.edges.some((edge) => edge.type === 'rpc_handles')).toBe(false);
  });

  it('bus-rabbit rpc_handler is not tagged as grpc protocol', () => {
    const result = busRabbitIngestAdapter.transform(
      {
        service_hint: 'orders-service',
        handlers: [{ path: 'orders-service/Handler.cs', role: 'rpc_handler', message_type: 'OrderRequested' }],
      },
      { ...baseCtx, parser_id: 'bus-rabbit' },
    );
    expect(result.edges.some((edge) => edge.type === 'rpc_handles')).toBe(true);
    expect(result.edges.every((edge) => edge.metadata?.protocol !== 'grpc')).toBe(true);
  });
});
