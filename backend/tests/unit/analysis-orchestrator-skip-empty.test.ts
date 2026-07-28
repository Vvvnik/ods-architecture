import { describe, expect, it } from 'vitest';

import { chunkFiles } from '../../src/services/analysis-file-chunks.js';

/**
 * Empty file lists must not spawn parsers (orchestrator returns skipped
 * when chunkFiles yields []). Mirrors FR-009 / T030.
 */
describe('analysis-orchestrator skip-empty (chunk gate)', () => {
  it('chunkFiles([]) yields no work units', () => {
    expect(chunkFiles([], 500)).toEqual([]);
  });
});
