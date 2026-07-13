import { useCallback, useState } from 'react';

import { clampMin, clampRange, readJsonStorage, writeJsonStorage } from './panelStorage.js';

const STORAGE_KEY = 'ods.workspace.panelWidths.v1';
const SPLITTER_PX = 5;

export const PANEL_MIN = {
  tree: 180,
  main: 240,
  props: 220,
} as const;

export const PANEL_DEFAULT = {
  tree: 260,
  /** Маркер flex-остатка; ширина колонки задаётся CSS `flex: 1`, не px. */
  main: 0,
  props: 280,
} as const;

export interface PanelWidths {
  tree: number;
  main: number;
  props: number;
}

function parseStored(raw: unknown): PanelWidths | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<PanelWidths>;
  if (typeof parsed.tree !== 'number' || typeof parsed.props !== 'number') {
    return null;
  }
  return {
    tree: clampMin(parsed.tree, PANEL_MIN.tree),
    main: typeof parsed.main === 'number' ? parsed.main : PANEL_DEFAULT.main,
    props: clampMin(parsed.props, PANEL_MIN.props),
  };
}

export function usePanelWidths() {
  const [widths, setWidths] = useState<PanelWidths>(
    () =>
      readJsonStorage(STORAGE_KEY, parseStored) ?? {
        tree: PANEL_DEFAULT.tree,
        main: PANEL_DEFAULT.main,
        props: PANEL_DEFAULT.props,
      },
  );

  const persist = useCallback((next: PanelWidths) => {
    setWidths(next);
    writeJsonStorage(STORAGE_KEY, next);
  }, []);

  const setTreeWidth = useCallback(
    (tree: number, containerWidth?: number) => {
      const max =
        typeof containerWidth === 'number' && containerWidth > 0
          ? Math.max(
              PANEL_MIN.tree,
              containerWidth - PANEL_MIN.main - PANEL_MIN.props - SPLITTER_PX * 2,
            )
          : Number.POSITIVE_INFINITY;
      persist({ ...widths, tree: clampRange(tree, PANEL_MIN.tree, max) });
    },
    [persist, widths],
  );

  const setPropsWidth = useCallback(
    (props: number, containerWidth?: number) => {
      const max =
        typeof containerWidth === 'number' && containerWidth > 0
          ? Math.max(
              PANEL_MIN.props,
              containerWidth - PANEL_MIN.main - PANEL_MIN.tree - SPLITTER_PX * 2,
            )
          : Number.POSITIVE_INFINITY;
      persist({ ...widths, props: clampRange(props, PANEL_MIN.props, max) });
    },
    [persist, widths],
  );

  return { widths, setTreeWidth, setPropsWidth, min: PANEL_MIN };
}
