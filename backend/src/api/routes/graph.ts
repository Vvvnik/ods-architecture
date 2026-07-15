import type { FastifyInstance } from 'fastify';

import { AppError } from '../../domain/errors.js';
import {
  fileGraphQuerySchema,
  graphSearchQuerySchema,
  graphSummaryQuerySchema,
  graphViewQuerySchema,
  listGraphNodeEdgesQuerySchema,
  listGraphNodesQuerySchema,
} from '../schemas/graph.schemas.js';
import type { GraphService } from '../../services/graph.service.js';
import type { GraphViewService } from '../../services/graph-view.service.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';

export function registerGraphRoutes(
  app: FastifyInstance,
  projectRepository: ProjectRepository,
  graphService: GraphService,
  graphViewService: GraphViewService,
): void {
  const prefix = '/api/v1/projects/:projectId/graph';

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/view`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphViewQuerySchema.parse(request.query);
      return graphViewService.getView(request.params.projectId, {
        analysisRunId: query.analysis_run_id,
        focus: query.focus || null,
        resolveFrom: query.resolve_from || null,
        maxNodes: query.max_nodes,
        maxEdges: query.max_edges,
      });
    },
  );

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
      const parentId =
        query.parent_id === undefined
          ? undefined
          : query.parent_id === '' || query.parent_id === 'root'
            ? 'root'
            : query.parent_id;
      return graphService.listNodes(request.params.projectId, {
        analysisRunId: query.analysis_run_id,
        path: query.path,
        kind: query.kind,
        parentId,
        limit: query.limit,
        offset: query.offset,
      });
    },
  );

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/search`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphSearchQuerySchema.parse(request.query);
      return graphService.search(request.params.projectId, query.q, {
        analysisRunId: query.analysis_run_id,
        limit: query.limit,
        offset: query.offset,
      });
    },
  );

  // Wildcard: nodeId содержит `/` (path), а nginx часто декодирует %2F —
  // тогда `:nodeId` не матчит. Как у files/*: один хвост пути после /nodes/.
  app.get<{
    Params: { projectId: string; '*': string };
    Querystring: Record<string, unknown>;
  }>(`${prefix}/nodes/*`, async (request) => {
    await assertProjectExists(projectRepository, request.params.projectId);
    const rest = request.params['*'] ?? '';
    const projectId = request.params.projectId;

    if (rest.endsWith('/edges')) {
      const nodeId = decodeNodeId(rest.slice(0, -'/edges'.length));
      const query = listGraphNodeEdgesQuerySchema.parse(request.query);
      return graphService.getNodeEdges(projectId, nodeId, {
        analysisRunId: query.analysis_run_id,
        direction: query.direction,
        limit: query.limit,
      });
    }

    if (rest.endsWith('/ancestors')) {
      const nodeId = decodeNodeId(rest.slice(0, -'/ancestors'.length));
      const query = graphSummaryQuerySchema.parse(request.query);
      return graphService.getNodeAncestors(projectId, nodeId, query.analysis_run_id);
    }

    const query = graphSummaryQuerySchema.parse(request.query);
    return graphService.getNodeById(projectId, decodeNodeId(rest), query.analysis_run_id);
  });

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

/** nodeId из path: один или два уровня decode (прокси + encodeURIComponent). */
function decodeNodeId(raw: string): string {
  let value = raw;
  try {
    value = decodeURIComponent(value);
  } catch {
    return raw;
  }
  if (value.includes('%')) {
    try {
      value = decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return value;
}
