import { describe, expect, it } from 'vitest';

import type { AiJobDocument } from '../../src/domain/ai-job.js';
import { AppError } from '../../src/domain/errors.js';
import type { AiJobRepository } from '../../src/repositories/ai-job.repository.js';
import { AiJobService } from '../../src/services/ai-job.service.js';

describe('AiJobService', () => {
  it('supersedes a previous job and rejects its docs write binding', async () => {
    const jobs: AiJobDocument[] = [];
    let sequence = 0;
    const repository = {
      create: async (input: Omit<AiJobDocument, 'id'> & { id?: string }) => {
        const job = { id: input.id ?? `job-${++sequence}`, ...input };
        jobs.push(job);
        return job;
      },
      getById: async (id: string) => jobs.find((job) => job.id === id) ?? null,
      update: async (id: string, patch: Partial<AiJobDocument>) => {
        const index = jobs.findIndex((job) => job.id === id);
        const updated = { ...jobs[index]!, ...patch, id };
        jobs[index] = updated;
        return updated;
      },
      findRunning: async (projectId: string) =>
        jobs.find((job) => job.project_id === projectId && job.status === 'running') ?? null,
      getCurrent: async () => null,
    } as unknown as AiJobRepository;
    const service = new AiJobService(repository);

    const first = await service.createRunning({
      projectId: 'project-1',
      analysisRunId: 'run-1',
      language: 'en',
      writeMode: 'overwrite',
      generationId: null,
    });
    const second = await service.createRunning({
      projectId: 'project-1',
      analysisRunId: 'run-2',
      language: 'ru',
      writeMode: 'versioned',
      generationId: 'generation-2',
    });

    expect(jobs.find((job) => job.id === first.id)?.status).toBe('cancelled');
    expect(second.status).toBe('running');
    await expect(service.assertCurrentRunning('project-1', first.id)).rejects.toMatchObject<AppError>({
      code: 'ai_job_not_current',
      statusCode: 409,
    });
    expect(await service.assertCurrentRunning('project-1', second.id)).toMatchObject({
      id: second.id,
      docs_write_mode: 'versioned',
    });
  });
});
