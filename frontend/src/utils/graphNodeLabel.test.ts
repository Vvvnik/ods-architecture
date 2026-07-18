import { describe, expect, it } from 'vitest';

import { shortGraphRefLabel } from './graphNodeLabel.js';

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

  it('falls back to last segment', () => {
    expect(shortGraphRefLabel('file:src/app.ts')).toBe('src/app.ts');
  });
});
