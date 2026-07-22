import type { FastifyInstance } from 'fastify';

import { AppError } from '../../domain/errors.js';
import {
  fileGraphQuerySchema,
  graphSearchQuerySchema,
  graphSummaryQuerySchema,
  graphUiOverviewQuerySchema,
  graphUiScreenQuerySchema,
  graphViewQuerySchema,
  listGraphNodeEdgesQuerySchema,
  listGraphNodesQuerySchema,
} from '../schemas/graph.schemas.js';
import type { GraphService } from '../../services/graph.service.js';
import type { GraphUiService } from '../../services/graph-ui.service.js';
import type { GraphViewService } from '../../services/graph-view.service.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';

export function registerGraphRoutes(
  app: FastifyInstance,
  projectRepository: ProjectRepository,
  graphService: GraphService,
  graphViewService: GraphViewService,
  graphUiService: GraphUiService,
): void {
  const prefix = '/api/v1/projects/:projectId/graph';

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/ui`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphUiOverviewQuerySchema.parse(request.query);
      return graphUiService.getOverview(request.params.projectId, {
        app: query.app,
        analysisRunId: query.analysis_run_id,
      });
    },
  );

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/ui/screen`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphUiScreenQuerySchema.parse(request.query);
      return graphUiService.getScreen(request.params.projectId, {
        screen: query.screen,
        app: query.app,
        analysisRunId: query.analysis_run_id,
      });
    },
  );

  app.get<{ Params: { projectId: string }; Querystring: Record<string, unknown> }>(
    `${prefix}/view`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = graphViewQuerySchema.parse(request.query);
      return graphViewService.getView(request.params.projectId, {
        analysisRunId: query.analysis_run_id,
        focus: query.focus || null,
        resolveFrom: query.resolve_from || null,
        layer: query.layer,
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

  // Wildcard: nodeId contains `/` (path), and nginx often decodes %2F,
  // so `:nodeId` does not match. Like files/*: one path suffix after /nodes/.
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

/** nodeId from path: one or two decode levels (proxy + encodeURIComponent). */
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
