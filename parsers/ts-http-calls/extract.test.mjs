import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractHttpCalls } from './extract.mjs';

describe('extractHttpCalls', () => {
  it('extracts apiFetch with API_BASE and method', () => {
    const src = `
const API_BASE = '/api/v1';
export async function apiFetch(path, init) {
  return fetch(\`\${API_BASE}\${path}\`, init);
}
await apiFetch('/projects', { method: 'GET' });
await apiFetch('/projects/p1/sync', { method: 'POST' });
`;
    const calls = extractHttpCalls(src, 'frontend/src/api/client.ts');
    assert.ok(calls.some((c) => c.path === '/api/v1/projects' && c.method === 'GET'));
    assert.ok(
      calls.some((c) => c.path === '/api/v1/projects/p1/sync' && c.method === 'POST'),
    );
    assert.equal(calls[0]?.service_hint, 'frontend');
  });

  it('extracts imported apiFetch call sites', () => {
    const src = `
import { apiFetch } from './client.js';
export function list() {
  return apiFetch('/projects');
}
export function sync(id) {
  return apiFetch(\`/projects/\${id}/sync\`, { method: 'POST' });
}
export function health() {
  return apiFetch('/health', { method: 'GET' });
}
`;
    const calls = extractHttpCalls(src, 'frontend/src/api/projects.ts');
    assert.ok(calls.some((c) => c.path === '/api/v1/projects' && c.method === 'GET'));
    assert.ok(calls.some((c) => c.path === '/api/v1/health' && c.method === 'GET'));
    assert.ok(
      calls.some((c) => c.path === '/api/v1/projects/:id/sync' && c.method === 'POST'),
    );
  });

  it('ignores external fetch', () => {
    const src = `
import { apiFetch } from './client.js';
fetch('https://example.com/api');
fetch('/?_=stale');
apiFetch('/projects');
`;
    const calls = extractHttpCalls(src, 'frontend/src/api/x.ts');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].path, '/api/v1/projects');
  });
});
