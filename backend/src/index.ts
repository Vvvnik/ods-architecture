import { loadConfig } from './config.js';
import { registerErrorHandler } from './api/plugins/error-handler.js';
import { registerAnalysisRoutes } from './api/routes/analysis.js';
import { registerGraphRoutes } from './api/routes/graph.js';
import { registerElementRoutes } from './api/routes/elements.js';
import { registerProjectRoutes } from './api/routes/projects.js';
import {
  bootstrapIndices,
  createElasticsearchClient,
  pingElasticsearch,
} from './infra/elasticsearch.js';
import { AnalysisRunRepository } from './repositories/analysis-run.repository.js';
import { ElementRepository } from './repositories/element.repository.js';
import { GraphEdgeRepository } from './repositories/graph-edge.repository.js';
import { GraphNodeRepository } from './repositories/graph-node.repository.js';
import { LanguageReportRepository } from './repositories/language-report.repository.js';
import { ParserEnvelopeRepository } from './repositories/parser-envelope.repository.js';
import { ProjectRepository } from './repositories/project.repository.js';
import { SyncSnapshotRepository } from './repositories/sync-snapshot.repository.js';
import { AnalysisOrchestratorService } from './services/analysis-orchestrator.service.js';
import { AnalysisService } from './services/analysis.service.js';
import { ChangeSetService } from './services/change-set.service.js';
import { GraphService } from './services/graph.service.js';
import {
  IngestRegistryService,
  registerBuiltinIngestAdapters,
} from './services/ingest/ingest-registry.service.js';
import { IngestService } from './services/ingest/ingest.service.js';
import { FileContentService } from './services/file-content.service.js';
import { LanguageDetectorService } from './services/language-detector.service.js';
import { ParserRegistryService } from './services/parser-registry.service.js';
import { ProjectService } from './services/project.service.js';
import { SyncService } from './services/sync.service.js';
import { WorkspaceService } from './services/workspace.service.js';
import Fastify from 'fastify';

export async function buildApp() {
  const config = loadConfig();

  const app = Fastify({
    logger: true,
  });

  registerErrorHandler(app);

  const esClient = createElasticsearchClient(config);
  await bootstrapIndices(esClient);

  const projectRepository = new ProjectRepository(esClient);
  const elementRepository = new ElementRepository(esClient);
  const languageReportRepository = new LanguageReportRepository(esClient);
  const analysisRunRepository = new AnalysisRunRepository(esClient);
  const parserEnvelopeRepository = new ParserEnvelopeRepository(esClient);
  const syncSnapshotRepository = new SyncSnapshotRepository(esClient);
  const graphNodeRepository = new GraphNodeRepository(esClient);
  const graphEdgeRepository = new GraphEdgeRepository(esClient);

  const workspaceService = new WorkspaceService(config);
  const parserRegistry = new ParserRegistryService(config);
  await parserRegistry.load();

  const ingestRegistry = new IngestRegistryService();
  registerBuiltinIngestAdapters(ingestRegistry);

  const languageDetector = new LanguageDetectorService(
    config,
    parserRegistry,
    analysisRunRepository,
  );
  const changeSetService = new ChangeSetService(config, syncSnapshotRepository, analysisRunRepository);

  const syncService = new SyncService(projectRepository, elementRepository, workspaceService);

  const ingestService = new IngestService(
    parserEnvelopeRepository,
    analysisRunRepository,
    graphNodeRepository,
    graphEdgeRepository,
    elementRepository,
    ingestRegistry,
    syncService,
    changeSetService,
    parserRegistry,
  );

  const orchestrator = new AnalysisOrchestratorService(
    config,
    projectRepository,
    languageReportRepository,
    analysisRunRepository,
    parserEnvelopeRepository,
    parserRegistry,
    changeSetService,
    syncService,
    ingestService,
  );

  const graphService = new GraphService(
    analysisRunRepository,
    graphNodeRepository,
    graphEdgeRepository,
  );

  const analysisService = new AnalysisService(
    projectRepository,
    languageReportRepository,
    languageDetector,
    changeSetService,
    orchestrator,
  );

  syncService.setAnalysisService(analysisService);

  const projectService = new ProjectService(
    projectRepository,
    elementRepository,
    graphNodeRepository,
    graphEdgeRepository,
    languageReportRepository,
    analysisRunRepository,
    parserEnvelopeRepository,
    syncSnapshotRepository,
    workspaceService,
    syncService,
    orchestrator,
  );
  const fileContentService = new FileContentService(projectRepository, elementRepository);

  await projectRepository.recoverInterruptedSyncs();
  await analysisRunRepository.recoverInterruptedRuns();

  app.decorate('config', config);
  app.decorate('esClient', esClient);
  app.decorate('projectRepository', projectRepository);
  app.decorate('elementRepository', elementRepository);
  app.decorate('workspaceService', workspaceService);
  app.decorate('syncService', syncService);
  app.decorate('projectService', projectService);
  app.decorate('fileContentService', fileContentService);
  app.decorate('analysisService', analysisService);

  app.get('/api/v1/health', async () => {
    const esOk = await pingElasticsearch(esClient);
    return {
      status: 'ok',
      elasticsearch: esOk ? 'ok' : 'degraded',
    };
  });

  registerProjectRoutes(app, projectService);
  registerElementRoutes(app, projectRepository, elementRepository, fileContentService);
  registerAnalysisRoutes(app, {
    projectRepository,
    analysisService,
    analysisRunRepository,
    parserEnvelopeRepository,
    orchestrator,
    syncService,
  });
  registerGraphRoutes(app, projectRepository, graphService);

  return app;
}

declare module 'fastify' {
  interface FastifyInstance {
    config: ReturnType<typeof loadConfig>;
    esClient: ReturnType<typeof createElasticsearchClient>;
    projectRepository: ProjectRepository;
    elementRepository: ElementRepository;
    workspaceService: WorkspaceService;
    syncService: SyncService;
    projectService: ProjectService;
    fileContentService: FileContentService;
    analysisService: AnalysisService;
  }
}
