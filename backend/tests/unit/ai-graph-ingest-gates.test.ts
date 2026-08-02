import { describe, expect, it } from 'vitest';

import { AppError } from '../../src/domain/errors.js';
import { AiGraphFinalizeService } from '../../src/services/ai-graph-finalize.service.js';
import { AiGraphIngestService } from '../../src/services/ai-graph-ingest.service.js';

const graphJob = {
  id: 'job',
  project_id: 'project',
  kind: 'graph_from_wc' as const,
  status: 'running' as const,
  analysis_run_id: 'run',
  docs_language: 'en' as const,
  docs_write_mode: 'overwrite' as const,
  docs_generation_id: null,
  progress: {},
  summary: null,
  provenance: { started_at: '' },
  created_at: '',
  updated_at: '',
};

const runningAiRun = {
  id: 'run',
  project_id: 'project',
  status: 'running',
  graph_builder: 'ai',
  ingest_errors: [],
};

function makeIngestService(overrides: {
  elements?: Map<string, { path: string; status: string }>;
  assertKind?: typeof graphJob;
  run?: typeof runningAiRun | null;
} = {}) {
  const completed: string[] = [];
  const patches: unknown[] = [];
  const upserted: unknown[] = [];
  const elements = overrides.elements ?? new Map([
    ['src/x.ts', { path: 'src/x.ts', status: 'auto_found' }],
  ]);
  const service = new AiGraphIngestService(
    {
      assertCurrentRunningKind: async () => overrides.assertKind ?? graphJob,
      complete: async (_project: string, _job: string, status: string) => {
        completed.push(status);
        return { ...graphJob, status };
      },
    } as never,
    {
      getById: async () => overrides.run === undefined ? runningAiRun : overrides.run,
      update: async (_id: string, patch: unknown) => { patches.push(patch); },
    } as never,
    { bulkUpsert: async (nodes: unknown[]) => { upserted.push(...nodes); } } as never,
    { bulkUpsert: async () => undefined } as never,
    { loadActiveByProject: async () => elements } as never,
  );
  return { service, completed, patches, upserted };
}

describe('AI graph ingest gates', () => {
  it('fails the current job and run for an unknown Canon kind', async () => {
    const { service, completed, patches } = makeIngestService();

    await expect(service.ingest('project', 'job', {
      analysis_run_id: 'run',
      items: [{ id: 'n', kind: 'unknown', name: 'Unknown', language: 'ts', path: 'src/x.ts' }],
    })).rejects.toMatchObject<AppError>({ code: 'validation_error', statusCode: 400 });
    expect(completed).toEqual(['failed']);
    expect(patches).toHaveLength(1);
  });

  it('rejects node paths marked not_needed', async () => {
    const { service, completed, upserted } = makeIngestService({
      elements: new Map([
        ['secret/x.ts', { path: 'secret/x.ts', status: 'not_needed' }],
      ]),
    });

    await expect(service.ingest('project', 'job', {
      analysis_run_id: 'run',
      items: [{ id: 'n', kind: 'class', name: 'X', language: 'ts', path: 'secret/x.ts' }],
    })).rejects.toMatchObject<AppError>({ code: 'validation_error', statusCode: 400 });
    expect(completed).toEqual(['failed']);
    expect(upserted).toHaveLength(0);
  });

  it('rejects ingest when the AI analysis run is no longer running', async () => {
    const { service, completed } = makeIngestService({
      run: { ...runningAiRun, status: 'failed' },
    });

    await expect(service.ingest('project', 'job', {
      analysis_run_id: 'run',
      items: [{ id: 'n', kind: 'class', name: 'X', language: 'ts', path: 'src/x.ts' }],
    })).rejects.toMatchObject<AppError>({ code: 'validation_error', statusCode: 400 });
    expect(completed).toEqual(['failed']);
  });

  it('turns succeeded completion into failure when no nodes were ingested', async () => {
    const completed: string[] = [];
    const patches: Array<Record<string, unknown>> = [];
    const service = new AiGraphFinalizeService(
      {
        assertCurrentRunning: async () => graphJob,
        complete: async (_project: string, _job: string, status: string) => {
          completed.push(status);
          return { ...graphJob, status };
        },
      } as never,
      {
        getById: async () => ({ ...runningAiRun, ingest_errors: [] }),
        update: async (_id: string, patch: Record<string, unknown>) => { patches.push(patch); },
      } as never,
      { countByProjectAndRun: async () => 0 } as never,
      { deleteByProjectExceptRun: async () => undefined } as never,
    );

    await service.complete('project', 'job', 'succeeded');
    expect(completed).toEqual(['failed']);
    expect(patches[0]).toMatchObject({ status: 'failed', ingest_status: 'failed' });
  });

  it('does not publish when the AI run was interrupted (status failed)', async () => {
    const completed: string[] = [];
    const deleted: string[] = [];
    const service = new AiGraphFinalizeService(
      {
        assertCurrentRunning: async () => graphJob,
        complete: async (_project: string, _job: string, status: string) => {
          completed.push(status);
          return { ...graphJob, status };
        },
      } as never,
      {
        getById: async () => ({ ...runningAiRun, status: 'failed', ingest_errors: [] }),
        update: async () => undefined,
      } as never,
      { countByProjectAndRun: async () => 5 } as never,
      {
        deleteByProjectExceptRun: async () => { deleted.push('nodes'); },
      } as never,
    );

    await service.complete('project', 'job', 'succeeded');
    expect(completed).toEqual(['failed']);
    expect(deleted).toHaveLength(0);
  });
});
