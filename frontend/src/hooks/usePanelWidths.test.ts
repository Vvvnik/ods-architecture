import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { PANEL_MIN, usePanelWidths } from './usePanelWidths.js';
import { renderHook, act } from '@testing-library/react';

describe('usePanelWidths', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('clamps tree width to minimum', () => {
    const { result } = renderHook(() => usePanelWidths());
    act(() => {
      result.current.setTreeWidth(50);
    });
    expect(result.current.widths.tree).toBe(PANEL_MIN.tree);
  });

  it('restores from localStorage', () => {
    localStorage.setItem(
      'ods.workspace.panelWidths.v1',
      JSON.stringify({ tree: 300, main: 400, props: 250 }),
    );
    const { result } = renderHook(() => usePanelWidths());
    expect(result.current.widths.tree).toBe(300);
    expect(result.current.widths.props).toBe(250);
  });
});
