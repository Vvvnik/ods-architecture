import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractFastifyRoutes } from './extract.mjs';

describe('extractFastifyRoutes', () => {
  it('extracts full literal path', () => {
    const routes = extractFastifyRoutes(
      `import Fastify from 'fastify';
const app = Fastify();
app.get('/api/v1/health', async () => ({ ok: true }));
`,
      'backend/src/index.ts',
    );
    assert.equal(routes.length, 1);
    assert.equal(routes[0].method, 'GET');
    assert.equal(routes[0].path, '/api/v1/health');
    assert.equal(routes[0].path_complete, true);
    assert.equal(routes[0].service_hint, 'backend');
  });

  it('joins const prefix with template literal', () => {
    const routes = extractFastifyRoutes(
      `const prefix = '/api/v1/projects/:projectId/graph';
app.get(\`\${prefix}/view\`, handler);
`,
      'backend/src/api/routes/graph.ts',
    );
    assert.equal(routes[0].method, 'GET');
    assert.equal(routes[0].path, '/api/v1/projects/:projectId/graph/view');
    assert.equal(routes[0].path_complete, true);
    assert.equal(routes[0].handler_name, 'handler');
  });

  it('handles TypeScript generics before path arg', () => {
    const routes = extractFastifyRoutes(
      `const prefix = '/api/v1/projects/:projectId/graph';
app.get<{ Params: { projectId: string } }>(\`\${prefix}/view\`, async () => ({}));
`,
      'backend/src/api/routes/graph.ts',
    );
    assert.equal(routes[0].path, '/api/v1/projects/:projectId/graph/view');
    assert.equal(routes[0].path_complete, true);
  });

  it('does not invent prefix from other files', () => {
    const routes = extractFastifyRoutes(
      `app.get(\`\${unknownPrefix}/x\`, fn);
`,
      'backend/src/api/routes/x.ts',
    );
    assert.equal(routes[0].path_complete, false);
    assert.equal(routes[0].path, '/x');
  });
});
