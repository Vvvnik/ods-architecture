import { describe, expect, it } from 'vitest';

import { displayGraphNodeLabel, shortGraphRefLabel } from './graphNodeLabel.js';

describe('shortGraphRefLabel', () => {
  it('strips compose service path', () => {
    expect(
      shortGraphRefLabel('compose:service:docker/docker-compose.dev.yml#frontend'),
    ).toBe('frontend');
  });

  it('formats http_endpoint refs as METHOD path', () => {
    expect(
      shortGraphRefLabel(
        'ts-api-routes:http_endpoint:docker/docker-compose.dev.yml#backend|POST|/api/v1/projects/:projectId/analysis/runs',
      ),
    ).toBe('POST /api/v1/projects/:projectId/analysis/runs');
  });

  it('formats openapi http_endpoint ids', () => {
    expect(shortGraphRefLabel('openapi:http_endpoint:GET:/api/v1/health')).toBe(
      'GET /api/v1/health',
    );
  });

  it('falls back to last segment', () => {
    expect(shortGraphRefLabel('file:src/app.ts')).toBe('src/app.ts');
  });
});

describe('displayGraphNodeLabel', () => {
  it('prefers qualified_name for endpoints', () => {
    expect(
      displayGraphNodeLabel({
        id: 'e1',
        kind: 'http_endpoint',
        name: '/api/v1/x',
        qualified_name: 'GET /api/v1/x',
      }),
    ).toBe('GET /api/v1/x');
  });

  it('does not show raw id when name equals id', () => {
    const id = 'compose:service:docker/docker-compose.dev.yml#backend';
    expect(displayGraphNodeLabel({ id, kind: 'service', name: id }, id)).toBe('backend');
  });
});
