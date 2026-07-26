import type { FastifyInstance, FastifyRequest } from 'fastify';

import { AppError } from '../../domain/errors.js';
import type { AnalysisRunRepository } from '../../repositories/analysis-run.repository.js';
import type { GraphNodeRepository } from '../../repositories/graph-node.repository.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';
import type { AgentPromptService } from '../../services/agent-prompt.service.js';
import type { AiJobService } from '../../services/ai-job.service.js';
import type { DocsExportService } from '../../services/docs-export.service.js';
import type { DocsService } from '../../services/docs.service.js';
import { resolveLatestGraphRunId } from '../../services/graph-run-resolver.js';
import {
  deleteDocsContentQuerySchema,
  docsPathQuerySchema,
  downloadPromptSchema,
  writeDocsContentSchema,
} from '../schemas/docs.schemas.js';

export function registerDocsRoutes(
  app: FastifyInstance,
  deps: {
    projectRepository: ProjectRepository;
    analysisRunRepository: AnalysisRunRepository;
    graphNodeRepository: GraphNodeRepository;
    docsService: DocsService;
    aiJobService: AiJobService;
    agentPromptService: AgentPromptService;
    docsExportService?: DocsExportService;
  },
): void {
  const prefix = '/api/v1/projects/:projectId/docs';

  app.get<{ Params: { projectId: string } }>(prefix, async (request) => {
    await assertProjectExists(deps.projectRepository, request.params.projectId);
    await deps.agentPromptService.ensureSeeded(
      request.params.projectId,
      app.config.PUBLIC_API_BASE_URL || requestBaseUrl(request),
    );
    return deps.docsService.listTree(request.params.projectId);
  });

  app.get<{ Params: { projectId: string }; Querystring: { path?: string } }>(
    `${prefix}/content`,
    async (request) => {
      await assertProjectExists(deps.projectRepository, request.params.projectId);
      const query = docsPathQuerySchema.parse(request.query);
      return {
        path: query.path,
        content: await deps.docsService.read(request.params.projectId, query.path),
      };
    },
  );

  app.put<{ Params: { projectId: string } }>(`${prefix}/content`, async (request) => {
    await assertProjectExists(deps.projectRepository, request.params.projectId);
    const body = writeDocsContentSchema.parse(request.body);
    const job = await deps.aiJobService.assertCurrentRunning(request.params.projectId, body.job_id);
    await deps.docsService.write(request.params.projectId, body.path, body.content, {
      mode: job.docs_write_mode,
      generationId: job.docs_generation_id,
    });
    return { path: body.path };
  });

  app.delete<{ Params: { projectId: string }; Querystring: { path?: string; job_id?: string } }>(
    `${prefix}/content`,
    async (request, reply) => {
      await assertProjectExists(deps.projectRepository, request.params.projectId);
      const query = deleteDocsContentQuerySchema.parse(request.query);
      const job = await deps.aiJobService.assertCurrentRunning(request.params.projectId, query.job_id);
      await deps.docsService.delete(request.params.projectId, query.path, {
        mode: job.docs_write_mode,
        generationId: job.docs_generation_id,
      });
      return reply.status(204).send();
    },
  );

  app.post<{ Params: { projectId: string } }>(`${prefix}/download-prompt`, async (request, reply) => {
    await assertProjectExists(deps.projectRepository, request.params.projectId);
    const body = downloadPromptSchema.parse(request.body);
    const analysisRunId = await resolveLatestGraphRunId(
      await deps.analysisRunRepository.listByProjectId(request.params.projectId, 50),
      (runId) => deps.graphNodeRepository.countByProjectAndRun(request.params.projectId, runId),
    );
    if (!analysisRunId) {
      throw new AppError('graph_not_ready', undefined, 409);
    }

    const job = await deps.aiJobService.createRunning({
      projectId: request.params.projectId,
      analysisRunId,
      language: body.language,
      writeMode: body.write_mode,
      generationId: body.generation_id ?? null,
    });
    const prompt = await deps.agentPromptService.renderForJob(
      job,
      app.config.PUBLIC_API_BASE_URL || requestBaseUrl(request),
    );
    await deps.docsService.writeAgent(request.params.projectId, prompt);

    return reply
      .header('X-ODS-AI-Job-Id', job.id)
      .header('Content-Disposition', 'attachment; filename="AGENT.md"')
      .type('text/markdown; charset=utf-8')
      .send(prompt);
  });

  app.post<{ Params: { projectId: string } }>(`${prefix}/export`, async (request, reply) => {
    await assertProjectExists(deps.projectRepository, request.params.projectId);
    if (!deps.docsExportService) {
      throw new AppError('internal_error', 'Export service unavailable', 500);
    }
    const pack = await deps.docsExportService.buildPack(request.params.projectId);
    return reply
      .header('Content-Disposition', `attachment; filename="${pack.filename}"`)
      .type('application/zip')
      .send(pack.buffer);
  });
}

async function assertProjectExists(repository: ProjectRepository, projectId: string): Promise<void> {
  if (!(await repository.getById(projectId))) {
    throw new AppError('not_found', undefined, 404);
  }
}

function requestBaseUrl(request: FastifyRequest): string {
  const forwardedProto = request.headers['x-forwarded-proto'];
  const protocol = typeof forwardedProto === 'string' ? forwardedProto.split(',')[0] : request.protocol;
  const host = request.headers.host;
  return host ? `${protocol}://${host}/api/v1` : 'http://localhost:8080/api/v1';
}
