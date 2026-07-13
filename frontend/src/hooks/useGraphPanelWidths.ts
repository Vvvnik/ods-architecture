import { useCallback, useState } from 'react';

import { clampMin, clampRange, readJsonStorage, writeJsonStorage } from './panelStorage.js';

const STORAGE_KEY = 'ods.graph.panelWidths.v1';

export const GRAPH_PANEL_MIN = {
  nodes: 220,
  edges: 260,
} as const;

export const GRAPH_PANEL_DEFAULT = {
  nodes: 360,
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
    () => readJsonStorage(STORAGE_KEY, parseStored) ?? { nodes: GRAPH_PANEL_DEFAULT.nodes },
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
