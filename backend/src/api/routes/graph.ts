import type { FastifyInstance } from 'fastify';

import { AppError } from '../../domain/errors.js';
import {
  fileGraphQuerySchema,
  graphSummaryQuerySchema,
  listGraphNodeEdgesQuerySchema,
  listGraphNodesQuerySchema,
} from '../schemas/graph.schemas.js';
import type { GraphService } from '../../services/graph.service.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';

export function registerGraphRoutes(
  app: FastifyInstance,
  projectRepository: ProjectRepository,
  graphService: GraphService,
): void {
  const prefix = '/api/v1/projects/:projectId/graph';

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/summary`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphSummaryQuerySchema.parse(request.query);
      return graphService.getSummary(request.params.projectId, query.analysis_run_id);
    },
  );

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/nodes`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = listGraphNodesQuerySchema.parse(request.query);
      return graphService.listNodes(request.params.projectId, {
        analysisRunId: query.analysis_run_id,
        path: query.path,
        kind: query.kind,
        limit: query.limit,
        offset: query.offset,
      });
    },
  );

  app.get<{ Params: { projectId: string; nodeId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/nodes/:nodeId`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphSummaryQuerySchema.parse(request.query);
      return graphService.getNodeById(
        request.params.projectId,
        decodeURIComponent(request.params.nodeId),
        query.analysis_run_id,
      );
    },
  );

  app.get<{ Params: { projectId: string; nodeId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/nodes/:nodeId/edges`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = listGraphNodeEdgesQuerySchema.parse(request.query);
      return graphService.getNodeEdges(
        request.params.projectId,
        decodeURIComponent(request.params.nodeId),
        {
          analysisRunId: query.analysis_run_id,
          direction: query.direction,
          limit: query.limit,
        },
      );
    },
  );

  app.get<{
    Params: { projectId: string; '*': string };
    Querystring: Record<string, unknown>;
  }>(`${prefix}/files/*`, async (request) => {
    await assertProjectExists(projectRepository, request.params.projectId);
    const query = fileGraphQuerySchema.parse(request.query);

    const suffix = request.params['*'] ?? '';
    if (!suffix.endsWith('/dependencies')) {
      throw new AppError('not_found', undefined, 404);
    }

    const encodedPath = suffix.slice(0, -'/dependencies'.length);
    const filePath = decodeURIComponent(encodedPath);
    return graphService.getFileDependencies(request.params.projectId, filePath, {
      analysisRunId: query.analysis_run_id,
      limit: query.limit,
    });
  });
}

async function assertProjectExists(
  projectRepository: ProjectRepository,
  projectId: string,
): Promise<void> {
  const project = await projectRepository.getById(projectId);
  if (!project) {
    throw new AppError('not_found', undefined, 404);
  }
}
