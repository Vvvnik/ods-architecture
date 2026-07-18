import { useCallback, useState } from 'react';

import { clampMin, clampRange, readJsonStorage, writeJsonStorage } from './panelStorage.js';

const STORAGE_KEY = 'ods.graph.panelWidths.v2';

export const GRAPH_PANEL_MIN = {
  nodes: 220,
  edges: 260,
} as const;

function defaultNodesWidth(): number {
  if (typeof window === 'undefined') {
    return 720;
  }
  // Пока справа только «Связи» — отдаём узлам большую долю окна
  return Math.max(
    GRAPH_PANEL_MIN.nodes,
    Math.round(window.innerWidth * 0.62) - 48,
  );
}

export const GRAPH_PANEL_DEFAULT = {
  get nodes() {
    return defaultNodesWidth();
  },
} as const;

export interface GraphPanelWidths {
  nodes: number;
}

function parseStored(raw: unknown): GraphPanelWidths | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Partial<GraphPanelWidths>;
  if (typeof parsed.nodes !== 'number') return null;
  return { nodes: clampMin(parsed.nodes, GRAPH_PANEL_MIN.nodes) };
}

/** Ширины двух колонок Графа (узлы | рёбра); рёбра = остаток flex. */
export function useGraphPanelWidths() {
  const [widths, setWidths] = useState<GraphPanelWidths>(
    () =>
      readJsonStorage(STORAGE_KEY, parseStored) ?? {
        nodes: defaultNodesWidth(),
      },
  );

  const persist = useCallback((next: GraphPanelWidths) => {
    setWidths(next);
    writeJsonStorage(STORAGE_KEY, next);
  }, []);

  const setNodesWidth = useCallback(
    (nodes: number, containerWidth?: number) => {
      const max =
        typeof containerWidth === 'number' && containerWidth > 0
          ? Math.max(
              GRAPH_PANEL_MIN.nodes,
              containerWidth - GRAPH_PANEL_MIN.edges - 5,
            )
          : Number.POSITIVE_INFINITY;
      persist({ nodes: clampRange(nodes, GRAPH_PANEL_MIN.nodes, max) });
    },
    [persist],
  );

  return { widths, setNodesWidth, min: GRAPH_PANEL_MIN };
}
