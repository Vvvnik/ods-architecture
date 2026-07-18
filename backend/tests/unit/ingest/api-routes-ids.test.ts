import { describe, expect, it } from 'vitest';

import {
  alignClientPathToFastifySplatRoute,
  httpEndpointNodeId,
  inferComposeFile,
  resolveApiRouteService,
  serviceHintFromSourcePath,
  unscopedServiceStable,
} from '../../../src/services/ingest/api-routes-ids.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

describe('api-routes-ids', () => {
  it('builds service|METHOD|path id', () => {
    const id = httpEndpointNodeId(
      'ts-api-routes',
      'docker-compose.yml#backend',
      'get',
      '/api/v1/health',
    );
    expect(id).toBe(
      'ts-api-routes:http_endpoint:docker-compose.yml#backend|GET|/api/v1/health',
    );
  });

  it('resolves backend path segment to compose service', () => {
    const resolved = resolveApiRouteService({
      sourcePath: 'backend/src/api/routes/graph.ts',
    });
    expect(resolved.serviceName).toBe('backend');
    expect(resolved.composeFile).toBe('docker/docker-compose.dev.yml');
    expect(resolved.serviceId).toBe(
      composeServiceNodeId('backend', 'docker/docker-compose.dev.yml'),
    );
  });

  it('unscoped when no service segment', () => {
    const path = 'HealthController.cs';
    expect(serviceHintFromSourcePath(path)).toBeNull();
    const resolved = resolveApiRouteService({ sourcePath: path });
    expect(resolved.serviceId).toBeNull();
    expect(resolved.serviceStable).toBe(unscopedServiceStable(path));
  });

  it('infers root compose for fixture layout', () => {
    expect(inferComposeFile('api/Program.cs')).toBe('docker-compose.yml');
  });

  it('aligns client paths under Fastify splat resources (014)', () => {
    expect(
      alignClientPathToFastifySplatRoute(
        '/api/v1/projects/:projectId/graph/nodes/:param/ancestors',
      ),
    ).toBe('/api/v1/projects/:projectId/graph/nodes/*');
    expect(
      alignClientPathToFastifySplatRoute(
        '/api/v1/projects/:projectId/graph/nodes/:param/edges',
      ),
    ).toBe('/api/v1/projects/:projectId/graph/nodes/*');
    expect(
      alignClientPathToFastifySplatRoute(
        '/api/v1/projects/:projectId/graph/files/:encodedPath/dependencies',
      ),
    ).toBe('/api/v1/projects/:projectId/graph/files/*');
    expect(
      alignClientPathToFastifySplatRoute('/api/v1/projects/:projectId/graph/summary'),
    ).toBe('/api/v1/projects/:projectId/graph/summary');
    expect(alignClientPathToFastifySplatRoute('/api/v1/projects/:projectId')).toBe(
      '/api/v1/projects/:projectId',
    );
    expect(
      alignClientPathToFastifySplatRoute('/api/v1/projects/:projectId/graph/nodes/*'),
    ).toBe('/api/v1/projects/:projectId/graph/nodes/*');
  });
});
