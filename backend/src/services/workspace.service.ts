import { access, mkdir, rm, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { simpleGit } from 'simple-git';

import type { AppConfig } from '../config.js';
import { AppError } from '../domain/errors.js';
import type { ProjectDocument } from '../domain/project.js';

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export class WorkspaceService {
  constructor(private readonly config: AppConfig) {}

  resolveWorkingCopyRoot(
    projectId: string,
    sourceType: ProjectDocument['source_type'],
    sourceValue: string,
  ): string {
    if (sourceType === 'git_url') {
      return resolve(this.config.DATA_ROOT, 'working-copies', projectId);
    }
    return resolve(sourceValue);
  }

  async prepareProject(project: ProjectDocument): Promise<void> {
    if (project.source_type === 'git_url') {
      await this.prepareGitClone(project);
      return;
    }

    await this.validateLocalPath(project.source_value, project.working_copy_root);
  }

  async assertWorkingCopy(project: ProjectDocument): Promise<void> {
    const root = project.working_copy_root;
    if (!(await pathExists(root))) {
      throw new AppError('source_unreachable', 'Working copy is unavailable', 400);
    }

    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      throw new AppError('source_unreachable', 'Working copy is not a directory', 400);
    }
  }

  async refreshWorkingCopy(project: ProjectDocument): Promise<void> {
    if (project.source_type === 'git_url') {
      await this.prepareGitClone(project);
      return;
    }

    await this.validateLocalPath(project.source_value, project.working_copy_root);
  }

  private async prepareGitClone(project: ProjectDocument): Promise<void> {
    const target = project.working_copy_root;
    await mkdir(dirname(target), { recursive: true });

    const hasGit = await pathExists(join(target, '.git'));

    try {
      if (!hasGit) {
        await simpleGit().clone(project.source_value, target, [
          '--depth',
          String(this.config.GIT_CLONE_DEPTH),
        ]);
      } else {
        await simpleGit(target).pull();
      }
    } catch {
      throw new AppError('source_unreachable', 'Failed to fetch repository from Git URL', 400);
    }
  }

  private async validateLocalPath(sourceValue: string, workingCopyRoot: string): Promise<void> {
    const resolved = resolve(sourceValue);

    if (!(await pathExists(resolved))) {
      throw new AppError('source_unreachable', 'Local path is unavailable', 400);
    }

    const info = await stat(resolved);
    if (!info.isDirectory()) {
      throw new AppError('source_unreachable', 'Local path is not a directory', 400);
    }

    if (!(await pathExists(join(resolved, '.git')))) {
      throw new AppError('source_unreachable', 'Local path is not a Git repository', 400);
    }

    if (resolve(workingCopyRoot) !== resolved) {
      throw new AppError('source_unreachable', 'Invalid working copy root', 400);
    }
  }

  async removeWorkingCopy(project: ProjectDocument): Promise<void> {
    if (project.source_type !== 'git_url') {
      return;
    }

    await rm(project.working_copy_root, { recursive: true, force: true });
  }
}
