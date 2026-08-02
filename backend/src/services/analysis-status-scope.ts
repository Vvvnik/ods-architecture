import { posix } from 'node:path';

import type { ElementDocument, ElementStatus } from '../domain/element.js';

/**
 * Statuses included in parser analysis and AI WC reads (027 Status scope).
 * Legacy `found` maps to include (closest to auto_found).
 */
const INCLUDED_STATUSES = new Set<ElementStatus>(['auto_found', 'needed', 'found']);

/**
 * Statuses excluded from analysis / AI WC.
 * Legacy `unused` maps to exclude (closest to not_needed).
 * Descendants under a not_needed folder typically carry not_needed via sync inherit;
 * this helper filters on the element status field only.
 */
const EXCLUDED_STATUSES = new Set<ElementStatus>(['not_needed', 'unused']);

/** True when the element status is in analysis / AI WC scope. */
export function isIncludedInAnalysis(status: ElementStatus): boolean {
  return INCLUDED_STATUSES.has(status);
}

/** True when the element status is out of analysis / AI WC scope. */
export function isExcludedFromAnalysis(status: ElementStatus): boolean {
  return EXCLUDED_STATUSES.has(status) || !INCLUDED_STATUSES.has(status);
}

/**
 * Applies an element's own status and any active ancestor status. Sync normally
 * cascades folder status to descendants; checking ancestors keeps the analysis
 * boundary correct for legacy or partially migrated element documents.
 */
export function isPathIncludedInAnalysis(
  path: string,
  elementsByPath: ReadonlyMap<string, Pick<ElementDocument, 'status'>>,
): boolean {
  let current = path;
  for (;;) {
    const element = elementsByPath.get(current);
    if (element && !isIncludedInAnalysis(element.status)) {
      return false;
    }
    if (!current) {
      return true;
    }
    current = posix.dirname(current);
    if (current === '.') {
      current = '';
    }
  }
}
