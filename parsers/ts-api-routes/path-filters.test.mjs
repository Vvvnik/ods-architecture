import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTestOrSpecPath } from './path-filters.mjs';

describe('isTestOrSpecPath', () => {
  it('skips tests directories and *.test.* files', () => {
    assert.equal(isTestOrSpecPath('backend/tests/unit/foo.ts'), true);
    assert.equal(isTestOrSpecPath('frontend/src/__tests__/x.ts'), true);
    assert.equal(isTestOrSpecPath('frontend/src/api/client.test.ts'), true);
    assert.equal(isTestOrSpecPath('src/foo.spec.tsx'), true);
  });

  it('keeps production sources', () => {
    assert.equal(isTestOrSpecPath('backend/src/api/routes/graph.ts'), false);
    assert.equal(isTestOrSpecPath('frontend/src/api/client.ts'), false);
  });

  it('skips root parsers/ modules (dogfood)', () => {
    assert.equal(isTestOrSpecPath('parsers/ts-http-calls/extract.test.mjs'), true);
    assert.equal(isTestOrSpecPath('parsers/ts-api-routes/run.mjs'), true);
  });
});
