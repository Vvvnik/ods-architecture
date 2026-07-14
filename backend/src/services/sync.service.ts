import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { posix } from 'node:path';

import type { AppConfig } from '../config.js';
import { AppError } from '../domain/errors.js';
import type { ElementType, ElementStatus } from '../domain/element.js';
import type { SyncStatus } from '../domain/project.js';
import type { SnapshotFile } from '../domain/sync-snapshot.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { AnalysisService } from './analysis.service.js';
import {
  FileInventoryService,
  pathDeniedBySegment,
} from './file-inventory.service.js';
import type { WorkspaceService } from './workspace.service.js';

export class SyncService {
  private readonly locks = new Set<string>();

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly elementRepository: ElementRepository,
    private readonly workspaceService: WorkspaceService,
    private readonly config: AppConfig,
    private readonly fileInventoryService: FileInventoryService,
    private analysisService?: AnalysisService,
  ) {}

  setAnalysisService(analysisService: AnalysisService): void {
    this.analysisService = analysisService;
  }

  isRunning(projectId: string): boolean {
    return this.locks.has(projectId);
  }

  assertCanStartSync(projectId: string, syncStatus: SyncStatus): void {
    if (this.locks.has(projectId) || syncStatus === 'running') {
      throw new AppError('sync_in_progress', undefined, 409);
    }
  }

  /** Reserve in-memory lock before scheduling async runSync (manual POST /sync). */
  beginScheduledSync(projectId: string, syncStatus: SyncStatus): void {
    this.assertCanStartSync(projectId, syncStatus);
    this.locks.add(projectId);
  }

  scheduleSync(projectId: string): void {
    void this.runSync(projectId);
  }

  releaseSyncLock(projectId: string): void {
    this.locks.delete(projectId);
  }

  async runSync(projectId: string): Promise<void> {
    const lockHeld = this.locks.has(projectId);
    if (!lockHeld) {
      this.locks.add(projectId);
    }

    try {
      const project = await this.projectRepository.getById(projectId);
      if (!project) {
        return;
      }

      await this.projectRepository.update(projectId, {
        sync_status: 'running',
        last_error_message: null,
      });

      await this.workspaceService.refreshWorkingCopy(project);
      await this.workspaceService.assertWorkingCopy(project);

      const activePaths = new Set<string>();
      const inventoryFiles: SnapshotFile[] = [];
      let partialErrors = 0;
      const denylist = new Set(this.config.ANALYSIS_DETECTOR_DENYLIST);

      await this.scanDirectory(
        project.id,
        project.working_copy_root,
        '',
        activePaths,
        inventoryFiles,
        denylist,
        () => {
          partialErrors += 1;
        },
      );

      this.fileInventoryService.publishFromSyncWalk(project.id, inventoryFiles);

      await this.elementRepository.softDeleteExceptPaths(project.id, activePaths, false);

      await this.elementRepository.refresh();

      const syncStatus = partialErrors > 0 ? 'partial' : 'success';
      const errorMessage =
        partialErrors > 0
          ? `Синхронизация завершена с ошибками на ${partialErrors} путях`
          : null;
      const lastSyncAt = new Date().toISOString();

      // Детект языков пока status=running — иначе UI показывает «Готово»/модалки,
      // а бейдж списка ещё «Синхронизация…», либо модалки открываются до конца детекта.
      if (this.analysisService) {
        try {
          await this.analysisService.runPostSyncDetection(projectId, lastSyncAt);
        } catch {
          // Sync дерева успешен; отчёт по языкам — best-effort (фронт покажет toast).
        }
      }

      await this.projectRepository.update(projectId, {
        sync_status: syncStatus,
        last_sync_at: lastSyncAt,
        last_error_message: errorMessage,
      });
    } catch (error) {
      const message =
        error instanceof AppError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Ошибка синхронизации';

      await this.projectRepository.update(projectId, {
        sync_status: 'failed',
        last_error_message: message,
      });
    } finally {
      this.locks.delete(projectId);
    }
  }

  private async scanDirectory(
    projectId: string,
    absoluteDir: string,
    relativeDir: string,
    activePaths: Set<string>,
    inventoryFiles: SnapshotFile[],
    denylist: Set<string>,
    onPathError: () => void,
  ): Promise<void> {
    let entries;

    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      onPathError();
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git') {
        continue;
      }

      const relPath = relativeDir
        ? posix.join(relativeDir, entry.name)
        : entry.name;
      const absPath = join(absoluteDir, entry.name);
      const deniedForAnalysis = denylist.has(entry.name);

      try {
        if (entry.isDirectory()) {
          activePaths.add(relPath);
          await this.upsertScannedElement(projectId, relPath, relativeDir, 'directory');
          if (deniedForAnalysis) {
            // Still sync tree, but do not descend for analysis inventory (matches detector denylist).
            continue;
          }
          await this.scanDirectory(
            projectId,
            absPath,
            relPath,
            activePaths,
            inventoryFiles,
            denylist,
            onPathError,
          );
          continue;
        }

        if (entry.isFile()) {
          activePaths.add(relPath);
          await this.upsertScannedElement(projectId, relPath, relativeDir, 'file');
          if (!pathDeniedBySegment(relPath, denylist)) {
            try {
              const fileStat = await stat(absPath);
              inventoryFiles.push({
                path: relPath,
                mtime_ms: fileStat.mtimeMs,
                size: fileStat.size,
              });
            } catch {
              onPathError();
            }
          }
          continue;
        }

        if (entry.isSymbolicLink()) {
          const linkStat = await stat(absPath);
          if (linkStat.isDirectory()) {
            activePaths.add(relPath);
            await this.upsertScannedElement(projectId, relPath, relativeDir, 'directory');
            if (!deniedForAnalysis) {
              await this.scanDirectory(
                projectId,
                absPath,
                relPath,
                activePaths,
                inventoryFiles,
                denylist,
                onPathError,
              );
            }
          } else if (linkStat.isFile()) {
            activePaths.add(relPath);
            await this.upsertScannedElement(projectId, relPath, relativeDir, 'file');
            if (!pathDeniedBySegment(relPath, denylist)) {
              inventoryFiles.push({
                path: relPath,
                mtime_ms: linkStat.mtimeMs,
                size: linkStat.size,
              });
            }
          }
        }
      } catch {
        onPathError();
      }
    }
  }

  private async upsertScannedElement(
    projectId: string,
    path: string,
    parentPath: string,
    type: ElementType,
  ): Promise<void> {
    const existing = await this.elementRepository.findByPath(projectId, path);
    const resolved = await this.resolveStatusOnSync(projectId, path, existing);

    await this.elementRepository.upsert(
      {
        id: existing?.id,
        project_id: projectId,
        path,
        parent_path: parentPath,
        type,
        status: resolved.status,
        is_active: true,
        status_manually_set: resolved.status_manually_set,
      },
      { refresh: false, deduplicate: false },
    );
  }

  private async resolveStatusOnSync(
    projectId: string,
    path: string,
    existing: Awaited<ReturnType<ElementRepository['findByPath']>>,
  ): Promise<{ status: ElementStatus; status_manually_set: boolean }> {
    if (existing?.status_manually_set) {
      return { status: existing.status, status_manually_set: true };
    }

    const inheritNotNeeded = await this.elementRepository.hasManualNotNeededAncestor(
      projectId,
      path,
    );
    if (inheritNotNeeded) {
      return { status: 'not_needed', status_manually_set: false };
    }

    if (existing) {
      return {
        status: existing.status ?? 'auto_found',
        status_manually_set: existing.status_manually_set ?? false,
      };
    }

    return { status: 'auto_found', status_manually_set: false };
  }
}
