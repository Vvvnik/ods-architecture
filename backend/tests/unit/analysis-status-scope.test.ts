import { describe, expect, it } from 'vitest';

import type { ElementStatus } from '../../src/domain/element.js';
import {
  isExcludedFromAnalysis,
  isIncludedInAnalysis,
  isPathIncludedInAnalysis,
} from '../../src/services/analysis-status-scope.js';

describe('analysis-status-scope', () => {
  const included: ElementStatus[] = ['auto_found', 'needed', 'found'];
  const excluded: ElementStatus[] = ['not_needed', 'unused'];

  it.each(included)('includes %s in analysis scope', (status) => {
    expect(isIncludedInAnalysis(status)).toBe(true);
    expect(isExcludedFromAnalysis(status)).toBe(false);
  });

  it.each(excluded)('excludes %s from analysis scope', (status) => {
    expect(isIncludedInAnalysis(status)).toBe(false);
    expect(isExcludedFromAnalysis(status)).toBe(true);
  });

  it('excludes a file beneath a not_needed directory', () => {
    const elements = new Map([
      ['src', { status: 'not_needed' as const }],
      ['src/private.ts', { status: 'needed' as const }],
      ['public.ts', { status: 'auto_found' as const }],
    ]);

    expect(isPathIncludedInAnalysis('src/private.ts', elements)).toBe(false);
    expect(isPathIncludedInAnalysis('public.ts', elements)).toBe(true);
  });
});
