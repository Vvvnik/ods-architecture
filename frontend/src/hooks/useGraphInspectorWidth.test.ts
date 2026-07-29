import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  GRAPH_INSPECTOR_DEFAULT,
  GRAPH_INSPECTOR_MIN,
  useGraphInspectorWidth,
} from './useGraphInspectorWidth.js';

describe('useGraphInspectorWidth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults to 280px', () => {
    const { result } = renderHook(() => useGraphInspectorWidth());
    expect(result.current.inspectorWidth).toBe(GRAPH_INSPECTOR_DEFAULT);
  });

  it('clamps to minimum', () => {
    const { result } = renderHook(() => useGraphInspectorWidth());
    act(() => {
      result.current.setInspectorWidth(40);
    });
    expect(result.current.inspectorWidth).toBe(GRAPH_INSPECTOR_MIN);
  });

  it('restores from localStorage', () => {
    localStorage.setItem('ods.graph.inspectorWidth.v1', JSON.stringify({ inspector: 360 }));
    const { result } = renderHook(() => useGraphInspectorWidth());
    expect(result.current.inspectorWidth).toBe(360);
  });
});
