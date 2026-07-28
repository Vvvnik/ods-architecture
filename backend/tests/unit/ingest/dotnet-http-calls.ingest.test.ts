import { describe, expect, it } from 'vitest';
import { dotnetHttpCallsIngestAdapter } from '../../../src/services/ingest/adapters/dotnet-http-calls.ingest.js';

const ctx = {
  project_id: 'p',
  analysis_run_id: 'r',
  parser_id: 'dotnet-http-calls',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('dotnet-http-calls ingest', () => {
  it('emits http_calls edge for resolvable caller/callee', () => {
    const result = dotnetHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            path: '/api/v1/orders',
            source_path: 'orders-service/Clients/OrdersHttpClient.cs',
            service_hint: 'orders-service',
            callee_service_hint: 'backend',
            client_kind: 'httpclient',
          },
        ],
      },
      ctx,
    );
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].type).toBe('http_calls');
    expect(result.edges[0].metadata?.protocol).toBe('http');
  });

  it('falls back to external_api for unresolved callee', () => {
    const result = dotnetHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            path: '/x',
            source_path: 'orders-service/X.cs',
            service_hint: 'orders-service',
          },
        ],
      },
      ctx,
    );
    expect(result.edges).toHaveLength(1);
    expect(result.edges[0].to).toContain('dotnet-http-calls:external_api:');
  });
});
