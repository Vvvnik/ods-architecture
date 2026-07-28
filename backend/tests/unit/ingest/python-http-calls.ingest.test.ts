import { describe, expect, it } from 'vitest';

import { pythonHttpCallsIngestAdapter } from '../../../src/services/ingest/adapters/python-http-calls.ingest.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'python-http-calls',
  schema_version: '1',
  files_analyzed: ['http_clients/client_httpx.py'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('python-http-calls.ingest', () => {
  it('creates http_calls to python-api-routes endpoint when callee hint resolves', () => {
    const result = pythonHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            url: 'http://fastapi_app:8000/health',
            source_path: 'http_clients/client_httpx.py',
            client_kind: 'httpx',
            service_hint: 'http_clients',
            callee_service_hint: 'fastapi_app',
          },
        ],
      },
      ctx,
    );

    expect(result.edges).toHaveLength(1);
    expect(result.edges[0]?.type).toBe('http_calls');
    expect(result.edges[0]?.metadata?.client_kind).toBe('httpx');
    expect(result.edges[0]?.to).toContain('python-api-routes');
  });

  it('creates external_api when absolute URL has no callee hint', () => {
    const result = pythonHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            url: 'https://example.com/api',
            source_path: 'http_clients/client_requests.py',
            client_kind: 'requests',
            service_hint: 'http_clients',
          },
        ],
      },
      ctx,
    );

    expect(result.nodes.some((n) => n.kind === 'external_api')).toBe(true);
    expect(result.edges).toHaveLength(1);
  });

  it('skips calls without resolvable path/url', () => {
    const result = pythonHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            source_path: 'http_clients/x.py',
            client_kind: 'httpx',
            service_hint: 'http_clients',
          },
        ],
      },
      ctx,
    );
    expect(result.edges).toHaveLength(0);
  });
});
