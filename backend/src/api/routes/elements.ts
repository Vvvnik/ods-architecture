import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { AppError } from '../../domain/errors.js';
import type { ElementRepository } from '../../repositories/element.repository.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';
import type { ElementService } from '../../services/element.service.js';
import type { FileContentService } from '../../services/file-content.service.js';

const listChildrenQuerySchema = z.object({
  parent_path: z.string().default(''),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const updateElementStatusSchema = z.object({
  status: z.enum(['auto_found', 'needed', 'not_needed']),
});

export function registerElementRoutes(
  app: FastifyInstance,
  projectRepository: ProjectRepository,
  elementRepository: ElementRepository,
  fileContentService: FileContentService,
  elementService: ElementService,
): void {
  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    '/api/v1/projects/:projectId/elements',
    async (request) => {
      const project = await projectRepository.getById(request.params.projectId);
      if (!project) {
        throw new AppError('not_found', undefined, 404);
      }

      const query = listChildrenQuerySchema.parse(request.query);

      return elementRepository.listChildren({
        projectId: project.id,
        parentPath: query.parent_path,
        limit: query.limit,
        offset: query.offset,
      });
    },
  );

  app.get<{ Params: { projectId: string; elementId: string } }>(
    '/api/v1/projects/:projectId/elements/:elementId',
    async (request) => {
      return fileContentService.getElement(request.params.projectId, request.params.elementId);
    },
  );

  app.get<{ Params: { projectId: string; elementId: string } }>(
    '/api/v1/projects/:projectId/elements/:elementId/content',
    async (request) => {
      return fileContentService.getFileContent(request.params.projectId, request.params.elementId);
    },
  );

  app.patch<{ Params: { projectId: string; elementId: string } }>(
    '/api/v1/projects/:projectId/elements/:elementId',
    async (request) => {
      const project = await projectRepository.getById(request.params.projectId);
      if (!project) {
        throw new AppError('not_found', undefined, 404);
      }

      const body = updateElementStatusSchema.parse(request.body);
      return elementService.updateStatusWithCascade(
        project.id,
        request.params.elementId,
        body.status,
      );
    },
  );
}
