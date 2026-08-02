import { describe, expect, it } from 'vitest';

import type { AiJobDocument } from '../../src/domain/ai-job.js';
import type { AiJobRepository } from '../../src/repositories/ai-job.repository.js';
import { AiJobService } from '../../src/services/ai-job.service.js';

describe('AiJobService per-kind supersession', () => {
  it('keeps a running docs job when a graph job starts', async () => {
    const jobs: AiJobDocument[] = [];
    const repository = {
      create: async (input: Omit<AiJobDocument, 'id'> & { id?: string }) => {
        const job = { ...input, id: input.id ?? `job-${jobs.length + 1}` };
        jobs.push(job);
        return job;
      },
      update: async (id: string, patch: Partial<AiJobDocument>) => {
        const index = jobs.findIndex((job) => job.id === id);
        jobs[index] = { ...jobs[index]!, ...patch };
        return jobs[index]!;
      },
      getById: async (id: string) => jobs.find((job) => job.id === id) ?? null,
      findRunning: async (projectId: string, kind: AiJobDocument['kind']) =>
        jobs.find((job) => job.project_id === projectId && job.kind === kind && job.status === 'running') ?? null,
      getCurrent: async () => null,
      hasSucceeded: async () => false,
    } as unknown as AiJobRepository;
    const service = new AiJobService(repository);

    await service.createRunning({
      projectId: 'project', analysisRunId: 'docs-run', language: 'en', writeMode: 'overwrite', generationId: null,
    });
    await service.createRunning({
      projectId: 'project', analysisRunId: 'graph-run', language: 'en', writeMode: 'overwrite', generationId: null,
      kind: 'graph_from_wc',
    });

    expect(jobs.map((job) => [job.kind, job.status])).toEqual([
      ['docs_from_es', 'running'],
      ['graph_from_wc', 'running'],
    ]);
  });
});
