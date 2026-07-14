import { describe, expect, it } from 'vitest';

/** Timeout policy used by orchestrator runProcess */
function timeoutMs(manifestTimeout: number | undefined, configDefault: number): number {
  return manifestTimeout ?? configDefault;
}

describe('analysis-orchestrator-timeout', () => {
  it('uses manifest timeout over config default', () => {
    expect(timeoutMs(30_000, 600_000)).toBe(30_000);
    expect(timeoutMs(undefined, 600_000)).toBe(600_000);
  });
});
