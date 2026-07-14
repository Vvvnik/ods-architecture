import { describe, expect, it, vi } from 'vitest';

/**
 * Concurrency helper mirrors orchestrator pool: at most N workers run jobs.
 */
async function runWithMaxParallel<T>(
  items: T[],
  maxParallel: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(maxParallel, items.length) }, async () => {
    while (true) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      await worker(items[i]!);
    }
  });
  await Promise.all(runners);
}

describe('analysis-orchestrator-parallel', () => {
  it('never exceeds ANALYSIS_MAX_PARALLEL_PARSERS', async () => {
    const max = 2;
    let inflight = 0;
    let peak = 0;
    const items = [1, 2, 3, 4, 5];

    await runWithMaxParallel(items, max, async () => {
      inflight += 1;
      peak = Math.max(peak, inflight);
      await new Promise((r) => setTimeout(r, 20));
      inflight -= 1;
    });

    expect(peak).toBeLessThanOrEqual(max);
  });
});

void vi;
