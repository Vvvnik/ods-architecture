import type { FastifyInstance } from 'fastify';

import { AppError } from '../../domain/errors.js';
import {
  listRunsQuerySchema,
  startAnalysisRunSchema,
} from '../schemas/analysis.schemas.js';
import type { AnalysisOrchestratorService } from '../../services/analysis-orchestrator.service.js';
import type { AnalysisService } from '../../services/analysis.service.js';
import type { AnalysisRunRepository } from '../../repositories/analysis-run.repository.js';
import type { ParserEnvelopeRepository } from '../../repositories/parser-envelope.repository.js';
import type { ProjectRepository } from '../../repositories/project.repository.js';

export function registerAnalysisRoutes(
  app: FastifyInstance,
  deps: {
    projectRepository: ProjectRepository;
    analysisService: AnalysisService;
    analysisRunRepository: AnalysisRunRepository;
    parserEnvelopeRepository: ParserEnvelopeRepository;
    orchestrator: AnalysisOrchestratorService;
  },
): void {
  const {
    projectRepository,
    analysisService,
    analysisRunRepository,
    parserEnvelopeRepository,
    orchestrator,
  } = deps;

  const prefix = '/api/v1/projects/:projectId/analysis';

  app.get<{ Params: { projectId: string } }>(`${prefix}/language-report/latest`, async (request) => {
    await assertProjectExists(projectRepository, request.params.projectId);
    const report = await analysisService.getLatestLanguageReport(request.params.projectId);
    if (!report) {
      throw new AppError('language_report_not_found', undefined, 404);
    }
    return report;
  });

  app.get<{ Params: { projectId: string } }>(`${prefix}/change-set`, async (request) => {
    await assertProjectExists(projectRepository, request.params.projectId);
    return analysisService.getChangeSet(request.params.projectId);
  });

  app.post<{ Params: { projectId: string } }>(`${prefix}/runs`, async (request, reply) => {
    await assertProjectExists(projectRepository, request.params.projectId);
    const body = startAnalysisRunSchema.parse(request.body);
    const run = await analysisService.startRun(
      request.params.projectId,
      body.language_report_id,
      body.confirmed_change_set,
      { forceFull: body.force_full },
    );
    void reply.status(202);
    return run;
  });

  app.get<{ Params: { projectId: string }; Querystring: { limit?: string } }>(
    `${prefix}/runs`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const query = listRunsQuerySchema.parse(request.query);
      return analysisRunRepository.listByProjectId(request.params.projectId, query.limit);
    },
  );

  app.get<{ Params: { projectId: string; runId: string } }>(
    `${prefix}/runs/:runId`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const run = await analysisRunRepository.getById(request.params.runId);
      if (!run || run.project_id !== request.params.projectId) {
        throw new AppError('analysis_run_not_found', undefined, 404);
      }
      return run;
    },
  );

  app.get<{ Params: { projectId: string; runId: string } }>(
    `${prefix}/runs/:runId/envelopes`,
    async (request) => {
      await assertProjectExists(projectRepository, request.params.projectId);
      const run = await analysisRunRepository.getById(request.params.runId);
      if (!run || run.project_id !== request.params.projectId) {
        throw new AppError('analysis_run_not_found', undefined, 404);
      }

      const envelopes = await parserEnvelopeRepository.listByRunId(request.params.runId);
      return envelopes.map((envelope) => ({
        parser_id: envelope.parser_id,
        schema_version: envelope.schema_version,
        project_id: envelope.project_id,
        analysis_run_id: envelope.analysis_run_id,
        generated_at: envelope.generated_at,
        files_analyzed: envelope.files_analyzed,
        model: envelope.model,
      }));
    },
  );

  app.decorate('analysisRunning', (projectId: string) => orchestrator.isRunning(projectId));
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
