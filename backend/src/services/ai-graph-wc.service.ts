import { readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

import { AppError } from '../domain/errors.js';
import type { ElementDocument } from '../domain/element.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import { isPathIncludedInAnalysis } from './analysis-status-scope.js';
import type { AiJobService } from './ai-job.service.js';

const BINARY_PROBE_BYTES = 8 * 1024;

export class AiGraphWorkingCopyService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly elementRepository: ElementRepository,
    private readonly aiJobService: AiJobService,
    private readonly maxFileBytes: number,
  ) {}

  async listPaths(projectId: string, jobId: string): Promise<{ paths: string[] }> {
    await this.assertGraphJob(projectId, jobId);
    const elements = await this.elementRepository.loadActiveByProject(projectId);
    return {
      paths: [...elements.values()]
        .filter((element) => this.isAllowedFile(element, elements))
        .map((element) => element.path)
        .sort((a, b) => a.localeCompare(b)),
    };
  }

  async readContent(
    projectId: string,
    jobId: string,
    path: string,
  ): Promise<{ kind: 'text'; content: string } | { kind: 'not_text' | 'error'; error_code: string }> {
    await this.assertGraphJob(projectId, jobId);
    const project = await this.projectRepository.getById(projectId);
    if (!project) throw new AppError('not_found', undefined, 404);

    const elements = await this.elementRepository.loadActiveByProject(projectId);
    const element = elements.get(path);
    if (!element || !this.isAllowedFile(element, elements)) {
      throw new AppError('not_found', undefined, 404);
    }
    const filePath = resolve(project.working_copy_root, element.path);
    const rel = relative(project.working_copy_root, filePath);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`)) {
      throw new AppError('not_found', undefined, 404);
    }

    try {
      const metadata = await stat(filePath);
      if (metadata.size > this.maxFileBytes) {
        throw new AppError('file_too_large', undefined, 413);
      }
      const buffer = await readFile(filePath);
      if (buffer.length > this.maxFileBytes) {
        throw new AppError('file_too_large', undefined, 413);
      }
      if (buffer.subarray(0, BINARY_PROBE_BYTES).includes(0)) {
        return { kind: 'not_text', error_code: 'file_not_text' };
      }
      return { kind: 'text', content: new TextDecoder('utf-8', { fatal: true }).decode(buffer) };
    } catch (error: unknown) {
      if (error instanceof AppError) throw error;
      if (error instanceof TypeError) return { kind: 'error', error_code: 'encoding_unsupported' };
      return { kind: 'error', error_code: 'file_not_available' };
    }
  }

  private async assertGraphJob(projectId: string, jobId: string): Promise<void> {
    const job = await this.aiJobService.assertCurrentRunning(projectId, jobId);
    if (job.kind !== 'graph_from_wc') {
      throw new AppError('ai_job_not_current', undefined, 409);
    }
  }

  private isAllowedFile(
    element: ElementDocument,
    elementsByPath: ReadonlyMap<string, ElementDocument>,
  ): boolean {
    return (
      element.type === 'file' &&
      element.is_active &&
      isPathIncludedInAnalysis(element.path, elementsByPath)
    );
  }
}
