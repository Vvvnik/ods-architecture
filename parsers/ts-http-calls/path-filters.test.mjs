import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTestOrSpecPath } from './path-filters.mjs';

describe('isTestOrSpecPath', () => {
  it('skips tests directories and *.test.* files', () => {
    assert.equal(isTestOrSpecPath('backend/tests/unit/foo.ts'), true);
    assert.equal(isTestOrSpecPath('frontend/src/api/client.test.ts'), true);
  });

  it('keeps production sources', () => {
    assert.equal(isTestOrSpecPath('frontend/src/api/projects.ts'), false);
  });

  it('skips root parsers/ modules (dogfood)', () => {
    assert.equal(isTestOrSpecPath('parsers/ts-http-calls/extract.mjs'), true);
  });
});
