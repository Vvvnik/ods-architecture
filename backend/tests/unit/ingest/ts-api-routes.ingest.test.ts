import { describe, expect, it } from 'vitest';

import { tsApiRoutesIngestAdapter } from '../../../src/services/ingest/adapters/ts-api-routes.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'ts-api-routes',
  schema_version: '1',
  files_analyzed: ['backend/src/index.ts'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('ts-api-routes.ingest', () => {
  it('creates http_endpoint with source=code and exposes', () => {
    const result = tsApiRoutesIngestAdapter.transform(
      {
        routes: [
          {
            method: 'GET',
            path: '/api/v1/health',
            source_path: 'backend/src/index.ts',
            handler_name: 'healthHandler',
            service_hint: 'backend',
            path_complete: true,
          },
        ],
      },
      ctx,
    );

    const endpoint = result.nodes.find((n) => n.kind === 'http_endpoint');
    expect(endpoint?.metadata?.source).toBe('code');
    expect(endpoint?.metadata?.http_path).toBe('/api/v1/health');
    expect(endpoint?.metadata?.handler_name).toBe('healthHandler');
    expect(endpoint?.path).toBe('backend/src/index.ts');
    expect(endpoint?.parent_id).toBe(
      composeServiceNodeId('backend', 'docker/docker-compose.dev.yml'),
    );
    expect(result.edges.some((e) => e.type === 'exposes')).toBe(true);
  });

  it('empty routes yields no nodes', () => {
    const result = tsApiRoutesIngestAdapter.transform({ routes: [] }, ctx);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });
});
