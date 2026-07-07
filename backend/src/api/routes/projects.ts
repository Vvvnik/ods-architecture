import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { ProjectService } from '../../services/project.service.js';

const registerProjectSchema = z.object({
  source_type: z.enum(['git_url', 'local_path']),
  source_value: z.string().trim().min(1, 'source_value обязателен'),
  name: z.string().trim().min(1).optional(),
});

export function registerProjectRoutes(app: FastifyInstance, projectService: ProjectService): void {
  app.get('/api/v1/projects', async () => {
    return projectService.listProjects();
  });

  app.post('/api/v1/projects', async (request, reply) => {
    const body = registerProjectSchema.parse(request.body);
    const result = await projectService.register(body);

    void reply.status(result.created ? 201 : 200);
    return result.project;
  });

  app.get<{ Params: { projectId: string } }>('/api/v1/projects/:projectId', async (request) => {
    return projectService.getProject(request.params.projectId);
  });

  app.post<{ Params: { projectId: string } }>(
    '/api/v1/projects/:projectId/sync',
    async (request, reply) => {
      const project = await projectService.triggerSync(request.params.projectId);
      void reply.status(202);
      return project;
    },
  );
}
