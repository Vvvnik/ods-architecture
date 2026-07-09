import { readdir, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import type { AppConfig } from '../config.js';
import type { ChangeSet } from '../domain/analysis-run.js';
import type { SnapshotFile } from '../domain/sync-snapshot.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { SyncSnapshotRepository } from '../repositories/sync-snapshot.repository.js';
import { pathsMatchingLanguage } from './language-detector.service.js';

export interface ParserChangeSet {
  spawn: string[];
  deleted: string[];
}

export class ChangeSetService {
  constructor(
    private readonly config: AppConfig,
    private readonly syncSnapshotRepository: SyncSnapshotRepository,
    private readonly analysisRunRepository: AnalysisRunRepository,
  ) {}

  async buildChangeSet(projectId: string, workingCopyRoot: string): Promise<ChangeSet> {
    const currentFiles = await this.scanFiles(workingCopyRoot);
    const hasPriorAnalysis = await this.hasCompletedAnalysis(projectId);

    if (!hasPriorAnalysis) {
      return {
        project_id: projectId,
        incremental: false,
        added: currentFiles.map((file) => file.path),
        modified: [],
        deleted: [],
      };
    }

    const previous = await this.syncSnapshotRepository.getByProjectId(projectId);
    if (!previous || previous.files.length === 0) {
      return {
        project_id: projectId,
        incremental: false,
        added: currentFiles.map((file) => file.path),
        modified: [],
        deleted: [],
      };
    }

    const previousMap = new Map(previous.files.map((file) => [file.path, file]));
    const currentMap = new Map(currentFiles.map((file) => [file.path, file]));

    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const [path, file] of currentMap) {
      const prev = previousMap.get(path);
      if (!prev) {
        added.push(path);
        continue;
      }
      if (prev.mtime_ms !== file.mtime_ms || prev.size !== file.size) {
        modified.push(path);
      }
    }

    for (const path of previousMap.keys()) {
      if (!currentMap.has(path)) {
        deleted.push(path);
      }
    }

    const sortPaths = (paths: string[]) => [...paths].sort((a, b) => a.localeCompare(b));

    return {
      project_id: projectId,
      incremental: true,
      added: sortPaths(added),
      modified: sortPaths(modified),
      deleted: sortPaths(deleted),
    };
  }

  pathsForLanguage(paths: string[], language: string): string[] {
    return pathsMatchingLanguage(paths, language).sort((a, b) => a.localeCompare(b));
  }

  resolveParserChangeSet(changeSet: ChangeSet, language: string): ParserChangeSet {
    if (!changeSet.incremental) {
      return { spawn: [], deleted: [] };
    }

    return {
      spawn: this.pathsForLanguage([...changeSet.added, ...changeSet.modified], language),
      deleted: this.pathsForLanguage(changeSet.deleted, language),
    };
  }

  private async hasCompletedAnalysis(projectId: string): Promise<boolean> {
    const runs = await this.analysisRunRepository.listByProjectId(projectId, 20);
    return runs.some((run) =>
      ['success', 'partial', 'failed'].includes(run.status),
    );
  }

  async captureSnapshot(projectId: string, workingCopyRoot: string): Promise<void> {
    const files = await this.scanFiles(workingCopyRoot);
    await this.syncSnapshotRepository.upsert({
      project_id: projectId,
      captured_at: new Date().toISOString(),
      files,
    });
  }

  private async scanFiles(workingCopyRoot: string): Promise<SnapshotFile[]> {
    const denylist = new Set(this.config.ANALYSIS_DETECTOR_DENYLIST);
    const files: SnapshotFile[] = [];
    await this.walkFiles(workingCopyRoot, '', denylist, files);
    files.sort((a, b) => a.path.localeCompare(b.path));
    return files;
  }

  private async walkFiles(
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
          await this.walkFiles(absPath, relPath, denylist, files);
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
        // skip unreadable paths
      }
    }
  }
}
