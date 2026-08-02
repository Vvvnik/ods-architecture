import type { FastifyInstance } from 'fastify';

import { AppError } from '../../domain/errors.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';
import type { AiGraphFinalizeService } from '../../services/ai-graph-finalize.service.js';
import type { AiGraphIngestService } from '../../services/ai-graph-ingest.service.js';
import type { AiGraphWorkingCopyService } from '../../services/ai-graph-wc.service.js';
import type { AiJobService } from '../../services/ai-job.service.js';
import {
  aiGraphIngestSchema,
  aiGraphWorkingCopyContentQuerySchema,
} from '../schemas/ai-graph.schemas.js';
import {
  aiJobKindQuerySchema,
  aiJobProgressSchema,
  completeAiJobSchema,
} from '../schemas/docs.schemas.js';

export function registerAiJobRoutes(
  app: FastifyInstance,
  projectRepository: ProjectRepository,
  aiJobService: AiJobService,
  aiGraph?: {
    workingCopyService: AiGraphWorkingCopyService;
    ingestService: AiGraphIngestService;
    finalizeService: AiGraphFinalizeService;
  },
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
      if (aiGraph) {
        return aiGraph.finalizeService.complete(
          request.params.projectId,
          request.params.jobId,
          body.status,
          body.summary,
          body.provenance,
        );
      }
      return aiJobService.complete(
        request.params.projectId,
        request.params.jobId,
        body.status,
        body.summary,
        body.provenance,
      );
    },
  );

  if (!aiGraph) return;

  app.get<{ Params: { projectId: string; jobId: string } }>(
    `${prefix}/:jobId/wc/paths`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      return aiGraph.workingCopyService.listPaths(request.params.projectId, request.params.jobId);
    },
  );

  app.get<{ Params: { projectId: string; jobId: string }; Querystring: { path?: string } }>(
    `${prefix}/:jobId/wc/content`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = aiGraphWorkingCopyContentQuerySchema.parse(request.query);
      return aiGraph.workingCopyService.readContent(request.params.projectId, request.params.jobId, query.path);
    },
  );

  app.post<{ Params: { projectId: string; jobId: string } }>(
    `${prefix}/:jobId/graph/ingest`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const body = aiGraphIngestSchema.parse(request.body);
      await aiGraph.ingestService.ingest(request.params.projectId, request.params.jobId, body);
      return { accepted: body.items.length };
    },
  );
}

async function assertProjectExists(repository: ProjectRepository, projectId: string): Promise<void> {
  if (!(await repository.getById(projectId))) {
    throw new AppError('not_found', undefined, 404);
  }
}
