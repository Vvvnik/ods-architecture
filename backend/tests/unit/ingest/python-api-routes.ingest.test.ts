import { describe, expect, it } from 'vitest';

import { pythonApiRoutesIngestAdapter } from '../../../src/services/ingest/adapters/python-api-routes.ingest.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'python-api-routes',
  schema_version: '1',
  files_analyzed: ['fastapi_app/main.py'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('python-api-routes.ingest', () => {
  it('creates http_endpoint with framework metadata and exposes', () => {
    const result = pythonApiRoutesIngestAdapter.transform(
      {
        routes: [
          {
            method: 'GET',
            path: '/health',
            source_path: 'fastapi_app/main.py',
            service_hint: 'fastapi_app',
            path_complete: true,
            framework: 'fastapi',
          },
        ],
      },
      ctx,
    );

    const endpoint = result.nodes.find((n) => n.kind === 'http_endpoint');
    expect(endpoint?.metadata?.source).toBe('code');
    expect(endpoint?.metadata?.framework).toBe('fastapi');
    expect(endpoint?.language).toBe('python');
    expect(result.edges.some((e) => e.type === 'exposes')).toBe(true);
  });

  it('skips incomplete routes without inventing nodes', () => {
    const result = pythonApiRoutesIngestAdapter.transform(
      {
        routes: [{ method: 'GET', path: '', source_path: 'x.py' }],
      },
      ctx,
    );
    expect(result.nodes).toHaveLength(0);
  });
});
