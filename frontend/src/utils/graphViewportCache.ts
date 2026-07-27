/** Persist React Flow viewport (pan/zoom) across SPA navigations. */

export interface GraphViewport {
  x: number;
  y: number;
  zoom: number;
}

const STORAGE_PREFIX = 'ods:rf-viewport:v1:';

function isViewport(value: unknown): value is GraphViewport {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.x === 'number' &&
    typeof candidate.y === 'number' &&
    typeof candidate.zoom === 'number' &&
    Number.isFinite(candidate.x) &&
    Number.isFinite(candidate.y) &&
    Number.isFinite(candidate.zoom) &&
    candidate.zoom > 0
  );
}

export function loadGraphViewport(key: string): GraphViewport | null {
  if (!key || typeof sessionStorage === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isViewport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveGraphViewport(key: string, viewport: GraphViewport): void {
  if (!key || typeof sessionStorage === 'undefined') {
    return;
  }
  try {
    sessionStorage.setItem(
      STORAGE_PREFIX + key,
      JSON.stringify({ x: viewport.x, y: viewport.y, zoom: viewport.zoom }),
    );
  } catch {
    /* private mode / quota */
  }
}
