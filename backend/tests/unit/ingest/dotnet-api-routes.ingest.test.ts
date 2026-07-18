import { describe, expect, it } from 'vitest';

import { dotnetApiRoutesIngestAdapter } from '../../../src/services/ingest/adapters/dotnet-api-routes.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'dotnet-api-routes',
  schema_version: '1',
  files_analyzed: ['api/Program.cs'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('dotnet-api-routes.ingest', () => {
  it('creates endpoints for controller and minimal styles', () => {
    const result = dotnetApiRoutesIngestAdapter.transform(
      {
        routes: [
          {
            method: 'GET',
            path: '/api/[controller]',
            source_path: 'api/Controllers/HealthController.cs',
            style: 'controller',
            handler_name: 'Get',
            service_hint: 'api',
          },
          {
            method: 'GET',
            path: '/minimal/ping',
            source_path: 'api/Program.cs',
            style: 'minimal',
            service_hint: 'api',
          },
        ],
      },
      ctx,
    );

    expect(result.nodes.filter((n) => n.kind === 'http_endpoint')).toHaveLength(2);
    expect(result.nodes.every((n) => n.metadata?.source === 'code')).toBe(true);
    expect(result.edges.filter((e) => e.type === 'exposes')).toHaveLength(2);
    expect(result.edges[0]?.from).toBe(composeServiceNodeId('api', 'docker-compose.yml'));
  });

  it('empty routes yields no nodes', () => {
    const result = dotnetApiRoutesIngestAdapter.transform({ routes: [] }, ctx);
    expect(result.nodes).toHaveLength(0);
  });
});
