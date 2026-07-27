import { afterEach, describe, expect, it } from 'vitest';

import { loadGraphViewport, saveGraphViewport } from './graphViewportCache.js';

describe('graphViewportCache', () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it('round-trips viewport', () => {
    saveGraphViewport('graph-view:p1:root:system', { x: 12, y: -40, zoom: 1.4 });
    expect(loadGraphViewport('graph-view:p1:root:system')).toEqual({
      x: 12,
      y: -40,
      zoom: 1.4,
    });
  });

  it('returns null for missing or invalid entries', () => {
    expect(loadGraphViewport('missing')).toBeNull();
    sessionStorage.setItem('ods:rf-viewport:v1:bad', '{"zoom":0}');
    expect(loadGraphViewport('bad')).toBeNull();
  });
});
