import { describe, expect, it } from 'vitest';

import {
  findBestBootstrapSourceRunId,
  isGraphReadyRun,
  isShrunkenIncrementalSnapshot,
  resolveLatestGraphRunId,
  type GraphRunCandidate,
} from '../../src/services/graph-run-resolver.js';

const runs: GraphRunCandidate[] = [
  {
    id: 'run-new-empty',
    status: 'success',
    ingest_status: 'success',
    change_set: { incremental: true, added: [], modified: [], deleted: [] },
  },
  {
    id: 'run-broken',
    status: 'success',
    ingest_status: 'success',
    change_set: { incremental: true, added: ['my-test.py'], modified: [], deleted: [] },
  },
  {
    id: 'run-full',
    status: 'success',
    ingest_status: 'success',
    change_set: { incremental: false, added: [], modified: [], deleted: [] },
  },
];

describe('graph-run-resolver', () => {
  it('isGraphReadyRun accepts success and partial ingest', () => {
    expect(isGraphReadyRun({ status: 'success', ingest_status: 'success' })).toBe(true);
    expect(isGraphReadyRun({ status: 'partial', ingest_status: 'partial' })).toBe(true);
    expect(isGraphReadyRun({ status: 'failed', ingest_status: 'success' })).toBe(false);
  });

  it('detects shrunken incremental snapshots without deletions', () => {
    const run = runs[1]!;
    expect(isShrunkenIncrementalSnapshot(run, 1, 16)).toBe(true);
    expect(isShrunkenIncrementalSnapshot(run, 16, 16)).toBe(false);
    expect(
      isShrunkenIncrementalSnapshot(
        { ...run, change_set: { incremental: true, added: [], modified: [], deleted: ['x.ts'] } },
        10,
        16,
      ),
    ).toBe(false);
  });

  it('resolveLatestGraphRunId skips broken incremental runs', async () => {
    const counts = new Map([
      ['run-new-empty', 0],
      ['run-broken', 1],
      ['run-full', 16],
    ]);

    const resolved = await resolveLatestGraphRunId(runs, async (runId) => counts.get(runId) ?? 0);
    expect(resolved).toBe('run-full');
  });

  it('resolveLatestGraphRunId prefers newest complete snapshot', async () => {
    const extended = [
      {
        id: 'run-latest',
        status: 'success',
        ingest_status: 'success',
        change_set: { incremental: true, added: ['new.py'], modified: [], deleted: [] },
      },
      ...runs.slice(1),
    ];
    const counts = new Map([
      ['run-latest', 17],
      ['run-broken', 1],
      ['run-full', 16],
    ]);

    const resolved = await resolveLatestGraphRunId(extended, async (runId) => counts.get(runId) ?? 0);
    expect(resolved).toBe('run-latest');
  });

  it('findBestBootstrapSourceRunId picks run with most nodes', async () => {
    const counts = new Map([
      ['run-new-empty', 0],
      ['run-broken', 1],
      ['run-full', 16],
    ]);

    const source = await findBestBootstrapSourceRunId(
      runs,
      'run-broken',
      async (runId) => counts.get(runId) ?? 0,
    );
    expect(source).toBe('run-full');
  });
});
