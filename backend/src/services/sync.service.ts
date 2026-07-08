import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { posix } from 'node:path';

import { AppError } from '../domain/errors.js';
import type { ElementType, ElementStatus } from '../domain/element.js';
import type { SyncStatus } from '../domain/project.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { WorkspaceService } from './workspace.service.js';

export class SyncService {
  private readonly locks = new Set<string>();

  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly elementRepository: ElementRepository,
    private readonly workspaceService: WorkspaceService,
  ) {}

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
      let partialErrors = 0;

      await this.scanDirectory(
        project.id,
        project.working_copy_root,
        '',
        activePaths,
        () => {
          partialErrors += 1;
        },
      );

      await this.elementRepository.softDeleteExceptPaths(project.id, activePaths, false);

      await this.elementRepository.refresh();

      const syncStatus = partialErrors > 0 ? 'partial' : 'success';
      const errorMessage =
        partialErrors > 0
          ? `Синхронизация завершена с ошибками на ${partialErrors} путях`
          : null;

      await this.projectRepository.update(projectId, {
        sync_status: syncStatus,
        last_sync_at: new Date().toISOString(),
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

      try {
        if (entry.isDirectory()) {
          activePaths.add(relPath);
          await this.upsertScannedElement(projectId, relPath, relativeDir, 'directory');
          await this.scanDirectory(projectId, absPath, relPath, activePaths, onPathError);
          continue;
        }

        if (entry.isFile()) {
          activePaths.add(relPath);
          await this.upsertScannedElement(projectId, relPath, relativeDir, 'file');
          continue;
        }

        if (entry.isSymbolicLink()) {
          const linkStat = await stat(absPath);
          if (linkStat.isDirectory()) {
            activePaths.add(relPath);
            await this.upsertScannedElement(projectId, relPath, relativeDir, 'directory');
            await this.scanDirectory(projectId, absPath, relPath, activePaths, onPathError);
          } else if (linkStat.isFile()) {
            activePaths.add(relPath);
            await this.upsertScannedElement(projectId, relPath, relativeDir, 'file');
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
    const status = this.resolveStatusOnSync(existing);

    await this.elementRepository.upsert(
      {
        id: existing?.id,
        project_id: projectId,
        path,
        parent_path: parentPath,
        type,
        status,
        is_active: true,
        status_manually_set: existing?.status_manually_set ?? false,
      },
      { refresh: false, deduplicate: false },
    );
  }

  private resolveStatusOnSync(
    existing: Awaited<ReturnType<ElementRepository['findByPath']>>,
  ): ElementStatus {
    if (!existing) {
      return 'auto_found';
    }

    if (existing.status_manually_set) {
      return existing.status;
    }

    return existing.status ?? 'auto_found';
  }
}
