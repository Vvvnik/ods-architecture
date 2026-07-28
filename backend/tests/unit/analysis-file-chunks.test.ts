import { describe, expect, it } from 'vitest';

import { chunkFiles } from '../../src/services/analysis-file-chunks.js';

describe('chunkFiles', () => {
  it('returns empty for empty input', () => {
    expect(chunkFiles([], 500)).toEqual([]);
  });

  it('keeps a small list as one chunk', () => {
    expect(chunkFiles(['a.cs', 'b.cs'], 500)).toEqual([['a.cs', 'b.cs']]);
  });

  it('splits oversized lists into bounded chunks', () => {
    const files = Array.from({ length: 1200 }, (_, i) => `f${i}.cs`);
    const chunks = chunkFiles(files, 500);
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
    expect(chunks[2]).toHaveLength(200);
    expect(chunks.flat()).toEqual(files);
  });

  it('merges a tiny trailing remainder into the previous chunk', () => {
    const files = Array.from({ length: 1040 }, (_, i) => `f${i}.cs`);
    const chunks = chunkFiles(files, 500);
    // 500 + 500 + 40 → 40 < 10% of 500 → merge → 500 + 540
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(540);
    expect(chunks.flat()).toEqual(files);
  });

  it('treats non-positive size as 1', () => {
    expect(chunkFiles(['a', 'b'], 0)).toEqual([['a'], ['b']]);
  });
});
