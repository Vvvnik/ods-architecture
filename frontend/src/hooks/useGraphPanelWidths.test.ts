import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { GRAPH_PANEL_MIN, useGraphPanelWidths } from './useGraphPanelWidths.js';

describe('useGraphPanelWidths', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('clamps nodes width to minimum', () => {
    const { result } = renderHook(() => useGraphPanelWidths());
    act(() => {
      result.current.setNodesWidth(50);
    });
    expect(result.current.widths.nodes).toBe(GRAPH_PANEL_MIN.nodes);
  });

  it('restores from localStorage', () => {
    localStorage.setItem('ods.graph.panelWidths.v2', JSON.stringify({ nodes: 420 }));
    const { result } = renderHook(() => useGraphPanelWidths());
    expect(result.current.widths.nodes).toBe(420);
  });

  it('defaults to a wide nodes panel (~62% viewport)', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1200,
    });
    const { result } = renderHook(() => useGraphPanelWidths());
    expect(result.current.widths.nodes).toBe(Math.round(1200 * 0.62) - 48);
  });
});
