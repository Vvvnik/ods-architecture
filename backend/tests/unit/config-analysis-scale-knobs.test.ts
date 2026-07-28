import { describe, expect, it } from 'vitest';

import { loadConfig } from '../../src/config.js';

describe('analysis scale knobs (026)', () => {
  it('defaults parallel to 4, chunk 500, require-prebuilt false', () => {
    const cfg = loadConfig({});
    expect(cfg.ANALYSIS_MAX_PARALLEL_PARSERS).toBe(4);
    expect(cfg.ANALYSIS_PARSER_FILE_CHUNK_SIZE).toBe(500);
    expect(cfg.ANALYSIS_REQUIRE_PREBUILT).toBe(false);
  });

  it('parses env overrides', () => {
    const cfg = loadConfig({
      ANALYSIS_MAX_PARALLEL_PARSERS: '8',
      ANALYSIS_PARSER_FILE_CHUNK_SIZE: '250',
      ANALYSIS_REQUIRE_PREBUILT: 'true',
    });
    expect(cfg.ANALYSIS_MAX_PARALLEL_PARSERS).toBe(8);
    expect(cfg.ANALYSIS_PARSER_FILE_CHUNK_SIZE).toBe(250);
    expect(cfg.ANALYSIS_REQUIRE_PREBUILT).toBe(true);
  });
});
