import { describe, expect, it } from 'vitest';

import { resolveApiRouteService } from '../../../src/services/ingest/api-routes-ids.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

describe('api-routes service resolve (US3)', () => {
  it('maps backend/... to backend service without mass exposes', () => {
    const resolved = resolveApiRouteService({
      sourcePath: 'backend/src/api/routes/projects.ts',
    });
    expect(resolved.serviceId).toBe(
      composeServiceNodeId('backend', 'docker/docker-compose.dev.yml'),
    );
  });

  it('unscoped file does not invent a service id', () => {
    const resolved = resolveApiRouteService({ sourcePath: 'orphan.ts' });
    expect(resolved.serviceId).toBeNull();
    expect(resolved.serviceStable.startsWith('unscoped:')).toBe(true);
  });
});
