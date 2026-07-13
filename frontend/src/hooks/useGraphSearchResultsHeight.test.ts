import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import {
  SEARCH_RESULTS_HEIGHT_DEFAULT,
  SEARCH_RESULTS_HEIGHT_MIN,
  useGraphSearchResultsHeight,
} from './useGraphSearchResultsHeight.js';

describe('useGraphSearchResultsHeight', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults and clamps to minimum', () => {
    const { result } = renderHook(() => useGraphSearchResultsHeight());
    expect(result.current.height).toBe(SEARCH_RESULTS_HEIGHT_DEFAULT);
    act(() => {
      result.current.setListHeight(40);
    });
    expect(result.current.height).toBe(SEARCH_RESULTS_HEIGHT_MIN);
  });

  it('restores from localStorage', () => {
    localStorage.setItem(
      'ods.graph.searchResultsHeight.v1',
      JSON.stringify({ list: 260 }),
    );
    const { result } = renderHook(() => useGraphSearchResultsHeight());
    expect(result.current.height).toBe(260);
  });
});
