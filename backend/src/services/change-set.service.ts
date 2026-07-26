import { readdir, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';

import type { AppConfig } from '../config.js';
import type { ChangeSet } from '../domain/analysis-run.js';
import type { SnapshotFile } from '../domain/sync-snapshot.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { SyncSnapshotRepository } from '../repositories/sync-snapshot.repository.js';
import type { FileInventoryService } from './file-inventory.service.js';
import { pathsMatchingLanguage } from './language-detector.service.js';
import { pathsMatchingArtifact } from './artifact-detector.js';

export interface ParserChangeSet {
  spawn: string[];
  deleted: string[];
}

export class ChangeSetService {
  constructor(
    private readonly config: AppConfig,
    private readonly syncSnapshotRepository: SyncSnapshotRepository,
    _analysisRunRepository: AnalysisRunRepository,
    private readonly fileInventoryService?: FileInventoryService,
  ) {}

  async buildChangeSet(
    projectId: string,
    workingCopyRoot: string,
    currentFilesOverride?: SnapshotFile[],
  ): Promise<ChangeSet> {
    const currentFiles =
      currentFilesOverride ??
      (await this.resolveCurrentFiles(projectId, workingCopyRoot));
    return {
      project_id: projectId,
      incremental: false,
      added: currentFiles.map((file) => file.path).sort((a, b) => a.localeCompare(b)),
      modified: [],
      deleted: [],
    };
  }

  resolveArtifactChangeSet(changeSet: ChangeSet, artifactType: string): ParserChangeSet {
    if (!changeSet.incremental) {
      return { spawn: [], deleted: [] };
    }

    return {
      spawn: this.pathsForArtifact([...changeSet.added, ...changeSet.modified], artifactType),
      deleted: this.pathsForArtifact(changeSet.deleted, artifactType),
    };
  }

  pathsForArtifact(paths: string[], artifactType: string): string[] {
    return pathsMatchingArtifact(paths, artifactType).sort((a, b) => a.localeCompare(b));
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

  async captureSnapshot(
    projectId: string,
    workingCopyRoot: string,
    filesOverride?: SnapshotFile[],
  ): Promise<void> {
    const files =
      filesOverride ??
      this.fileInventoryService?.getCached(projectId)?.files ??
      (await this.scanFiles(workingCopyRoot));
    await this.syncSnapshotRepository.upsert({
      project_id: projectId,
      captured_at: new Date().toISOString(),
      files,
    });
  }

  private async resolveCurrentFiles(
    projectId: string,
    workingCopyRoot: string,
  ): Promise<SnapshotFile[]> {
    const cached = this.fileInventoryService?.getCached(projectId);
    if (cached) {
      return cached.files;
    }
    if (this.fileInventoryService) {
      const inventory = await this.fileInventoryService.buildFileInventory(
        projectId,
        workingCopyRoot,
        this.config.ANALYSIS_DETECTOR_DENYLIST,
      );
      return inventory.files;
    }
    return this.scanFiles(workingCopyRoot);
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
