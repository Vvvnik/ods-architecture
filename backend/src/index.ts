import Fastify from 'fastify';

import { registerErrorHandler } from './api/plugins/error-handler.js';
import { registerElementRoutes } from './api/routes/elements.js';
import { registerProjectRoutes } from './api/routes/projects.js';
import { loadConfig } from './config.js';
import {
  bootstrapIndices,
  createElasticsearchClient,
  pingElasticsearch,
} from './infra/elasticsearch.js';
import { ElementRepository } from './repositories/element.repository.js';
import { ProjectRepository } from './repositories/project.repository.js';
import { ProjectService } from './services/project.service.js';
import { FileContentService } from './services/file-content.service.js';
import { SyncService } from './services/sync.service.js';
import { WorkspaceService } from './services/workspace.service.js';

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
  const workspaceService = new WorkspaceService(config);
  const syncService = new SyncService(projectRepository, elementRepository, workspaceService);
  const projectService = new ProjectService(
    projectRepository,
    elementRepository,
    workspaceService,
    syncService,
  );
  const fileContentService = new FileContentService(projectRepository, elementRepository);

  await projectRepository.recoverInterruptedSyncs();

  app.decorate('config', config);
  app.decorate('esClient', esClient);
  app.decorate('projectRepository', projectRepository);
  app.decorate('elementRepository', elementRepository);
  app.decorate('workspaceService', workspaceService);
  app.decorate('syncService', syncService);
  app.decorate('projectService', projectService);
  app.decorate('fileContentService', fileContentService);

  app.get('/api/v1/health', async () => {
    const esOk = await pingElasticsearch(esClient);
    return {
      status: 'ok',
      elasticsearch: esOk ? 'ok' : 'degraded',
    };
  });

  registerProjectRoutes(app, projectService);
  registerElementRoutes(app, projectRepository, elementRepository, fileContentService);

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
  }
}
