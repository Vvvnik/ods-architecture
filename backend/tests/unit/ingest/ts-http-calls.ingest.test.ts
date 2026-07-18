import { describe, expect, it } from 'vitest';

import { tsHttpCallsIngestAdapter } from '../../../src/services/ingest/adapters/ts-http-calls.ingest.js';
import { httpEndpointNodeId } from '../../../src/services/ingest/api-routes-ids.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'ts-http-calls',
  schema_version: '1',
  files_analyzed: ['frontend/src/api/projects.ts'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('ts-http-calls.ingest', () => {
  it('creates http_calls to stable code endpoint id without creating nodes', () => {
    const result = tsHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            path: '/api/v1/health',
            source_path: 'frontend/src/api/projects.ts',
            service_hint: 'frontend',
            callee_service_hint: 'backend',
          },
        ],
      },
      ctx,
    );

    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(1);
    const edge = result.edges[0]!;
    expect(edge.type).toBe('http_calls');
    expect(edge.from).toBe(
      composeServiceNodeId('frontend', 'docker/docker-compose.dev.yml'),
    );
    expect(edge.to).toBe(
      httpEndpointNodeId(
        'ts-api-routes',
        'docker/docker-compose.dev.yml#backend',
        'GET',
        '/api/v1/health',
      ),
    );
    expect(edge.metadata?.source).toBe('code');
  });

  it('empty calls yields 0 edges', () => {
    const result = tsHttpCallsIngestAdapter.transform({ calls: [] }, ctx);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('skips when caller service cannot be resolved', () => {
    const result = tsHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            path: '/api/v1/x',
            source_path: 'src/util.ts',
            service_hint: null,
          },
        ],
      },
      ctx,
    );
    expect(result.edges).toHaveLength(0);
  });

  it('FR-011: depends_on in model does not produce http_calls', () => {
    const result = tsHttpCallsIngestAdapter.transform(
      {
        calls: [],
        depends_on: [{ from: 'frontend', to: 'backend' }],
      } as unknown,
      ctx,
    );
    expect(result.edges.filter((e) => e.type === 'http_calls')).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('aligns Fastify splat targets for nodes/* and files/*', () => {
    const result = tsHttpCallsIngestAdapter.transform(
      {
        calls: [
          {
            method: 'GET',
            path: '/api/v1/projects/:projectId/graph/nodes/:param/ancestors',
            source_path: 'frontend/src/api/graph.ts',
            service_hint: 'frontend',
            callee_service_hint: 'backend',
          },
          {
            method: 'GET',
            path: '/api/v1/projects/:projectId/graph/files/:encodedPath/dependencies',
            source_path: 'frontend/src/api/graph.ts',
            service_hint: 'frontend',
            callee_service_hint: 'backend',
          },
        ],
      },
      ctx,
    );

    expect(result.edges).toHaveLength(2);
    expect(result.edges[0]?.to).toBe(
      httpEndpointNodeId(
        'ts-api-routes',
        'docker/docker-compose.dev.yml#backend',
        'GET',
        '/api/v1/projects/:projectId/graph/nodes/*',
      ),
    );
    expect(result.edges[0]?.metadata?.http_path).toBe(
      '/api/v1/projects/:projectId/graph/nodes/:param/ancestors',
    );
    expect(result.edges[0]?.metadata?.endpoint_path).toBe(
      '/api/v1/projects/:projectId/graph/nodes/*',
    );
    expect(result.edges[1]?.to).toBe(
      httpEndpointNodeId(
        'ts-api-routes',
        'docker/docker-compose.dev.yml#backend',
        'GET',
        '/api/v1/projects/:projectId/graph/files/*',
      ),
    );
  });
});
