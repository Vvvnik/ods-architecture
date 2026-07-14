import { readdir, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import type { SnapshotFile } from '../domain/sync-snapshot.js';

export type FileInventorySource = 'sync_walk' | 'reuse';

export interface FileInventory {
  project_id: string;
  captured_at: string;
  files: SnapshotFile[];
  source: FileInventorySource;
}

/** Shared WC file inventory — one walk per sync+prep cycle (010 / FR-001). */
export class FileInventoryService {
  private readonly cache = new Map<string, FileInventory>();
  private walkCount = 0;

  getWalkCount(): number {
    return this.walkCount;
  }

  resetWalkCount(): void {
    this.walkCount = 0;
  }

  getCached(projectId: string): FileInventory | null {
    return this.cache.get(projectId) ?? null;
  }

  clearCached(projectId: string): void {
    this.cache.delete(projectId);
  }

  /**
   * Publish inventory produced during sync tree walk (does not walk again).
   * Counts as the cycle's single full walk for instrumentation.
   */
  publishFromSyncWalk(projectId: string, files: SnapshotFile[]): FileInventory {
    this.walkCount += 1;
    const inventory: FileInventory = {
      project_id: projectId,
      captured_at: new Date().toISOString(),
      files: [...files].sort((a, b) => a.path.localeCompare(b.path)),
      source: 'sync_walk',
    };
    this.cache.set(projectId, inventory);
    return inventory;
  }

  /** Independent walk — use when no sync inventory (tests / fallback). */
  async buildFileInventory(
    projectId: string,
    workingCopyRoot: string,
    denylist: readonly string[],
  ): Promise<FileInventory> {
    this.walkCount += 1;
    const denySet = new Set(denylist);
    const files: SnapshotFile[] = [];
    await walkInventoryFiles(workingCopyRoot, '', denySet, files);
    files.sort((a, b) => a.path.localeCompare(b.path));
    const inventory: FileInventory = {
      project_id: projectId,
      captured_at: new Date().toISOString(),
      files,
      source: 'sync_walk',
    };
    this.cache.set(projectId, inventory);
    return inventory;
  }

  /** Prefer cached sync inventory; otherwise walk once. */
  async getOrBuild(
    projectId: string,
    workingCopyRoot: string,
    denylist: readonly string[],
  ): Promise<FileInventory> {
    const cached = this.getCached(projectId);
    if (cached) {
      return { ...cached, source: cached.source === 'sync_walk' ? 'reuse' : cached.source };
    }
    return this.buildFileInventory(projectId, workingCopyRoot, denylist);
  }
}

export function pathDeniedBySegment(relativePath: string, denylist: Set<string>): boolean {
  if (denylist.size === 0) {
    return false;
  }
  for (const segment of relativePath.split('/')) {
    if (segment && denylist.has(segment)) {
      return true;
    }
  }
  return false;
}

async function walkInventoryFiles(
  absoluteDir: string,
  relativeDir: string,
  denylist: Set<string>,
  files: SnapshotFile[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === '.git' || denylist.has(entry.name)) {
      continue;
    }

    const relPath = relativeDir ? posix.join(relativeDir, entry.name) : entry.name;
    const absPath = join(absoluteDir, entry.name);

    try {
      if (entry.isDirectory()) {
        await walkInventoryFiles(absPath, relPath, denylist, files);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const fileStat = await stat(absPath);
      files.push({
        path: relPath,
        mtime_ms: fileStat.mtimeMs,
        size: fileStat.size,
      });
    } catch {
      // skip unreadable
    }
  }
}
