import { randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';

import { AppError } from '../domain/errors.js';
import { toProjectPublic } from '../domain/project.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { SyncService } from './sync.service.js';
import type { WorkspaceService } from './workspace.service.js';

export interface RegisterProjectInput {
  source_type: 'git_url' | 'local_path';
  source_value: string;
  name?: string;
}

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly elementRepository: ElementRepository,
    private readonly workspaceService: WorkspaceService,
    private readonly syncService: SyncService,
  ) {}

  async listProjects() {
    const projects = await this.projectRepository.list();
    return projects.map(toProjectPublic);
  }

  async getProject(projectId: string) {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }
    return toProjectPublic(project);
  }

  async triggerSync(projectId: string) {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    this.syncService.beginScheduledSync(projectId, project.sync_status);

    await this.projectRepository.update(projectId, {
      sync_status: 'running',
      last_error_message: null,
    });

    this.syncService.scheduleSync(projectId);

    const refreshed = await this.projectRepository.getById(projectId);
    return toProjectPublic(refreshed ?? project);
  }

  async register(input: RegisterProjectInput) {
    const existing = await this.projectRepository.findBySource(
      input.source_type,
      input.source_value,
    );

    if (existing) {
      return { project: toProjectPublic(existing), created: false as const };
    }

    const id = randomUUID();
    const workingCopyRoot = this.workspaceService.resolveWorkingCopyRoot(
      id,
      input.source_type,
      input.source_value,
    );

    const project = await this.projectRepository.create({
      id,
      name: input.name?.trim() || deriveProjectName(input.source_type, input.source_value),
      source_type: input.source_type,
      source_value: input.source_value,
      working_copy_root: workingCopyRoot,
      created_at: new Date().toISOString(),
      last_sync_at: null,
      sync_status: 'idle',
      last_error_message: null,
    });

    try {
      await this.workspaceService.prepareProject(project);
    } catch (error) {
      await this.workspaceService.removeWorkingCopy(project);
      await this.projectRepository.deleteById(project.id);
      throw error;
    }

    await this.projectRepository.update(project.id, {
      sync_status: 'running',
      last_error_message: null,
    });

    this.syncService.scheduleSync(project.id);

    const refreshed = await this.projectRepository.getById(project.id);
    return {
      project: toProjectPublic(refreshed ?? project),
      created: true as const,
    };
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    if (project.sync_status === 'running' || this.syncService.isRunning(projectId)) {
      throw new AppError('sync_in_progress', undefined, 409);
    }

    this.syncService.releaseSyncLock(projectId);
    await this.elementRepository.deleteByProjectId(projectId);
    await this.workspaceService.removeWorkingCopy(project);
    await this.projectRepository.deleteById(projectId);
  }
}

function deriveProjectName(
  sourceType: RegisterProjectInput['source_type'],
  sourceValue: string,
): string {
  if (sourceType === 'git_url') {
    const withoutGit = sourceValue.replace(/\.git$/i, '');
    const parts = withoutGit.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'project';
  }

  return basename(resolve(sourceValue)) || 'project';
}
