import { describe, expect, it } from 'vitest';

import { filterEdgesWithKnownEndpoints } from '../../../src/services/ingest/ingest.service.js';

describe('filterEdgesWithKnownEndpoints', () => {
  it('keeps binds_service when compose service target is not known yet', () => {
    const kept = filterEdgesWithKnownEndpoints(
      [{ id: 'angularjs-ui:ui_app:gateway-static', kind: 'ui_app', name: 'app' }],
      [
        {
          id: 'e1',
          from: 'angularjs-ui:ui_app:gateway-static',
          to: 'compose:service:api-gateway',
          type: 'binds_service',
        },
        {
          id: 'e2',
          from: 'angularjs-ui:ui_app:gateway-static',
          to: 'angularjs-ui:ui_route:welcome',
          type: 'contains',
        },
      ],
      new Set(),
    );

    expect(kept.map((e) => e.type).sort()).toEqual(['binds_service']);
  });

  it('keeps http_calls and exposes under the same race rule', () => {
    const kept = filterEdgesWithKnownEndpoints(
      [],
      [
        {
          id: 'e1',
          from: 'compose:service:api',
          to: 'compose:service:db',
          type: 'http_calls',
        },
        {
          id: 'e2',
          from: 'compose:service:api',
          to: 'http:endpoint:GET:/health',
          type: 'exposes',
        },
      ],
      new Set(),
    );

    expect(kept.map((e) => e.type).sort()).toEqual(['exposes', 'http_calls']);
  });
});
