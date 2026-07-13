/** Shared localStorage helpers for panel width hooks (workspace / graph). */

export function clampMin(value: number, min: number): number {
  return Math.max(min, Math.round(value));
}

export function clampRange(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function readJsonStorage<T>(key: string, validate: (raw: unknown) => T | null): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return validate(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeJsonStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // fail-soft
  }
}
