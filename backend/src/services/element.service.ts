import type { ElementPublic, ElementStatus } from '../domain/element.js';
import { toElementPublic } from '../domain/element.js';
import { AppError } from '../domain/errors.js';
import type { ElementRepository } from '../repositories/element.repository.js';

export const CASCADE_SOFT_LIMIT = 5000;

export interface ElementStatusUpdateResult extends ElementPublic {
  cascade?: { updated_count: number };
}

export class ElementService {
  constructor(private readonly elementRepository: ElementRepository) {}

  async updateStatusWithCascade(
    projectId: string,
    elementId: string,
    status: ElementStatus,
  ): Promise<ElementStatusUpdateResult> {
    const existing = await this.elementRepository.getById(elementId);
    if (!existing || existing.project_id !== projectId || !existing.is_active) {
      throw new AppError('not_found', undefined, 404);
    }

    if (existing.type === 'file') {
      const updated = await this.elementRepository.updateStatus(projectId, elementId, status);
      return toElementPublic(updated);
    }

    // FR-012: lift from not_needed → only the folder
    if (existing.status === 'not_needed' && status !== 'not_needed') {
      const updated = await this.elementRepository.updateStatus(projectId, elementId, status);
      return toElementPublic(updated);
    }

    const descendantCount = await this.elementRepository.countActiveDescendants(
      projectId,
      existing.path,
    );
    if (descendantCount > CASCADE_SOFT_LIMIT) {
      throw new AppError('cascade_too_large', undefined, 422);
    }

    const updatedCount = await this.elementRepository.updateStatusCascadeByPath(
      projectId,
      existing.path,
      status,
    );

    const refreshed = await this.elementRepository.getById(elementId);
    if (!refreshed) {
      throw new AppError('cascade_failed', undefined, 500);
    }

    return {
      ...toElementPublic(refreshed),
      cascade: { updated_count: updatedCount > 0 ? updatedCount : 1 },
    };
  }
}
