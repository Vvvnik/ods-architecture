export interface GraphRunCandidate {
  id: string;
  status: string;
  ingest_status?: string | null;
  change_set?: {
    incremental?: boolean;
    added?: string[];
    modified?: string[];
    deleted?: string[];
  } | null;
}

export function isGraphReadyRun(run: {
  status: string;
  ingest_status?: string | null;
}): boolean {
  const analysisOk = run.status === 'success' || run.status === 'partial';
  const ingestOk = run.ingest_status === 'success' || run.ingest_status === 'partial';
  return analysisOk && ingestOk;
}

export function isShrunkenIncrementalSnapshot(
  run: GraphRunCandidate,
  nodeCount: number,
  maxNodeCount: number,
): boolean {
  if (nodeCount >= maxNodeCount) {
    return false;
  }

  const changeSet = run.change_set;
  if (!changeSet?.incremental) {
    return false;
  }

  return (changeSet.deleted?.length ?? 0) === 0;
}

export async function resolveLatestGraphRunId(
  runs: GraphRunCandidate[],
  countNodes: (runId: string) => Promise<number>,
): Promise<string | null> {
  const nodeCounts = new Map<string, number>();
  let maxNodeCount = 0;

  for (const run of runs) {
    if (!isGraphReadyRun(run)) {
      continue;
    }

    const nodeCount = await countNodes(run.id);
    nodeCounts.set(run.id, nodeCount);
    if (nodeCount > maxNodeCount) {
      maxNodeCount = nodeCount;
    }
  }

  if (maxNodeCount === 0) {
    return null;
  }

  for (const run of runs) {
    if (!isGraphReadyRun(run)) {
      continue;
    }

    const nodeCount = nodeCounts.get(run.id) ?? 0;
    if (nodeCount === 0) {
      continue;
    }

    if (isShrunkenIncrementalSnapshot(run, nodeCount, maxNodeCount)) {
      continue;
    }

    return run.id;
  }

  for (const run of runs) {
    if (!isGraphReadyRun(run)) {
      continue;
    }

    if ((nodeCounts.get(run.id) ?? 0) === maxNodeCount) {
      return run.id;
    }
  }

  return null;
}

export async function findBestBootstrapSourceRunId(
  runs: GraphRunCandidate[],
  excludeRunId: string,
  countNodes: (runId: string) => Promise<number>,
): Promise<string | null> {
  let bestRunId: string | null = null;
  let bestNodeCount = 0;

  for (const run of runs) {
    if (run.id === excludeRunId || !isGraphReadyRun(run)) {
      continue;
    }

    const nodeCount = await countNodes(run.id);
    if (nodeCount > bestNodeCount) {
      bestNodeCount = nodeCount;
      bestRunId = run.id;
    }
  }

  return bestRunId;
}
