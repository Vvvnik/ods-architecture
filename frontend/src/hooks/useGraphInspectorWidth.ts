import { useCallback, useState } from 'react';

import { clampMin, clampRange, readJsonStorage, writeJsonStorage } from './panelStorage.js';

const STORAGE_KEY = 'ods.graph.inspectorWidth.v1';

export const GRAPH_INSPECTOR_MIN = 200;
export const GRAPH_CANVAS_MIN = 280;
export const GRAPH_INSPECTOR_DEFAULT = 280;

function parseStored(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as { inspector?: unknown };
  if (typeof parsed.inspector !== 'number') return null;
  return clampMin(parsed.inspector, GRAPH_INSPECTOR_MIN);
}

/** Right-hand inspector width for Graph view / Graph UI (canvas takes the rest). */
export function useGraphInspectorWidth() {
  const [inspectorWidth, setWidth] = useState(
    () => readJsonStorage(STORAGE_KEY, parseStored) ?? GRAPH_INSPECTOR_DEFAULT,
  );

  const setInspectorWidth = useCallback((inspector: number, containerWidth?: number) => {
    const max =
      typeof containerWidth === 'number' && containerWidth > 0
        ? Math.max(GRAPH_INSPECTOR_MIN, containerWidth - GRAPH_CANVAS_MIN - 5)
        : Number.POSITIVE_INFINITY;
    const next = clampRange(inspector, GRAPH_INSPECTOR_MIN, max);
    setWidth(next);
    writeJsonStorage(STORAGE_KEY, { inspector: next });
  }, []);

  return {
    inspectorWidth,
    setInspectorWidth,
    min: { inspector: GRAPH_INSPECTOR_MIN, canvas: GRAPH_CANVAS_MIN },
  };
}
