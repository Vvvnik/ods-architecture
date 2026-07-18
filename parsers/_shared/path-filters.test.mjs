import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isTestOrSpecPath } from './path-filters.mjs';

describe('isTestOrSpecPath', () => {
  it('skips tests directories and *.test.* files', () => {
    assert.equal(isTestOrSpecPath('src/__tests__/a.ts'), true);
    assert.equal(isTestOrSpecPath('foo.test.ts'), true);
  });

  it('keeps production sources', () => {
    assert.equal(isTestOrSpecPath('frontend/src/api/client.ts'), false);
  });

  it('skips root parsers/ modules (dogfood)', () => {
    assert.equal(isTestOrSpecPath('parsers/ts-http-calls/extract.mjs'), true);
  });
});
