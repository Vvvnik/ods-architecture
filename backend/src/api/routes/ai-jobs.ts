import type { FastifyInstance } from 'fastify';

import { AppError } from '../../domain/errors.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';
import type { AiJobService } from '../../services/ai-job.service.js';
import {
  aiJobKindQuerySchema,
  aiJobProgressSchema,
  completeAiJobSchema,
} from '../schemas/docs.schemas.js';

export function registerAiJobRoutes(
  app: FastifyInstance,
  projectRepository: ProjectRepository,
  aiJobService: AiJobService,
): void {
  const prefix = '/api/v1/projects/:projectId/ai-jobs';

  app.get<{ Params: { projectId: string }; Querystring: { kind?: string } }>(
    `${prefix}/current`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = aiJobKindQuerySchema.parse(request.query);
      const job = await aiJobService.getCurrent(request.params.projectId, query.kind);
      if (!job) throw new AppError('ai_job_not_found', undefined, 404);
      return job;
    },
  );

  app.get<{ Params: { projectId: string; jobId: string } }>(`${prefix}/:jobId`, async (request) => {
    await assertProjectExists(projectRepository, request.params.projectId);
    return aiJobService.get(request.params.projectId, request.params.jobId);
  });

  app.post<{ Params: { projectId: string; jobId: string } }>(
    `${prefix}/:jobId/progress`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      return aiJobService.progress(
        request.params.projectId,
        request.params.jobId,
        aiJobProgressSchema.parse(request.body),
      );
    },
  );

  app.post<{ Params: { projectId: string; jobId: string } }>(
    `${prefix}/:jobId/complete`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const body = completeAiJobSchema.parse(request.body);
      return aiJobService.complete(
        request.params.projectId,
        request.params.jobId,
        body.status,
        body.summary,
        body.provenance,
      );
    },
  );
}

async function assertProjectExists(repository: ProjectRepository, projectId: string): Promise<void> {
  if (!(await repository.getById(projectId))) {
    throw new AppError('not_found', undefined, 404);
  }
}
