import { useCallback, useState } from 'react';

import { clampMin, clampRange, readJsonStorage, writeJsonStorage } from './panelStorage.js';

const STORAGE_KEY = 'ods.graph.searchResultsHeight.v1';

export const SEARCH_RESULTS_HEIGHT_MIN = 100;
export const SEARCH_RESULTS_HEIGHT_DEFAULT = 220;

export interface GraphSearchResultsHeight {
  list: number;
}

function parseStored(raw: unknown): GraphSearchResultsHeight | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<GraphSearchResultsHeight>;
  if (typeof parsed.list !== 'number') return null;
  return { list: clampMin(parsed.list, SEARCH_RESULTS_HEIGHT_MIN) };
}

function maxListHeight(): number {
  if (typeof window === 'undefined') return 640;
  // До ~70% окна — сплиттер реально двигает границу с панелями Узлы/Связи
  return Math.max(SEARCH_RESULTS_HEIGHT_MIN, Math.round(window.innerHeight * 0.7));
}

/** Высота списка результатов поиска на Графе (узлы/рёбра — общая). */
export function useGraphSearchResultsHeight() {
  const [height, setHeight] = useState<GraphSearchResultsHeight>(
    () =>
      readJsonStorage(STORAGE_KEY, parseStored) ?? {
        list: SEARCH_RESULTS_HEIGHT_DEFAULT,
      },
  );

  const setListHeight = useCallback((list: number) => {
    const next = { list: clampRange(list, SEARCH_RESULTS_HEIGHT_MIN, maxListHeight()) };
    setHeight(next);
    writeJsonStorage(STORAGE_KEY, next);
  }, []);

  return {
    height: height.list,
    setListHeight,
    min: SEARCH_RESULTS_HEIGHT_MIN,
  };
}
