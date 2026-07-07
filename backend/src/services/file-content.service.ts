import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { toElementPublic, type ElementPublic } from '../domain/element.js';
import { AppError } from '../domain/errors.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';

const BINARY_PROBE_BYTES = 8 * 1024;

export type FileContentKind = 'text' | 'not_text' | 'error';

export interface FileContent {
  kind: FileContentKind;
  content?: string;
  error_code?: string;
}

export class FileContentService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly elementRepository: ElementRepository,
  ) {}

  async getElement(projectId: string, elementId: string): Promise<ElementPublic> {
    const element = await this.loadElement(projectId, elementId);
    return toElementPublic(element);
  }

  async getFileContent(projectId: string, elementId: string): Promise<FileContent> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    const element = await this.loadElement(projectId, elementId);

    if (element.type !== 'file') {
      throw new AppError('not_found', undefined, 404);
    }

    if (!element.is_active) {
      return { kind: 'error', error_code: 'file_not_available' };
    }

    const absolutePath = join(project.working_copy_root, element.path);

    let buffer: Buffer;
    try {
      buffer = await readFile(absolutePath);
    } catch {
      return { kind: 'error', error_code: 'file_not_available' };
    }

    const probe = buffer.subarray(0, Math.min(buffer.length, BINARY_PROBE_BYTES));
    if (probe.includes(0)) {
      return { kind: 'not_text' };
    }

    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
      return { kind: 'text', content };
    } catch {
      return { kind: 'error', error_code: 'encoding_unsupported' };
    }
  }

  private async loadElement(projectId: string, elementId: string) {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    const element = await this.elementRepository.getById(elementId);
    if (!element || element.project_id !== projectId) {
      throw new AppError('not_found', undefined, 404);
    }

    return element;
  }
}
