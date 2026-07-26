import type {
  AiJobDocument,
  AiJobKind,
  AiJobProgress,
  AiJobProvenance,
  AiJobStatus,
  DocsLanguage,
  DocsWriteMode,
} from '../domain/ai-job.js';
import { AppError } from '../domain/errors.js';
import type { AiJobRepository } from '../repositories/ai-job.repository.js';

export class AiJobService {
  constructor(private readonly repository: AiJobRepository) {}

  async createRunning(input: {
    projectId: string;
    analysisRunId: string;
    language: DocsLanguage;
    writeMode: DocsWriteMode;
    generationId: string | null;
    kind?: AiJobKind;
  }): Promise<AiJobDocument> {
    const kind = input.kind ?? 'docs_from_es';
    const current = await this.repository.findRunning(input.projectId, kind);
    const now = new Date().toISOString();
    if (current) {
      await this.repository.update(current.id, {
        status: 'cancelled',
        updated_at: now,
        provenance: { ...current.provenance, finished_at: now },
      });
    }
    return this.repository.create({
      project_id: input.projectId,
      kind,
      status: 'running',
      analysis_run_id: input.analysisRunId,
      docs_language: input.language,
      docs_write_mode: input.writeMode,
      docs_generation_id: input.generationId,
      progress: {},
      summary: null,
      provenance: { started_at: now },
      created_at: now,
      updated_at: now,
    });
  }

  async getCurrent(projectId: string, kind: AiJobKind = 'docs_from_es'): Promise<AiJobDocument | null> {
    return this.repository.getCurrent(projectId, kind);
  }

  async get(projectId: string, jobId: string): Promise<AiJobDocument> {
    const job = await this.repository.getById(jobId);
    if (!job || job.project_id !== projectId) {
      throw new AppError('ai_job_not_found', undefined, 404);
    }
    return job;
  }

  async assertCurrentRunning(projectId: string, jobId: string): Promise<AiJobDocument> {
    const job = await this.get(projectId, jobId);
    const current = await this.repository.findRunning(projectId, job.kind);
    if (job.status !== 'running' || current?.id !== job.id) {
      throw new AppError('ai_job_not_current', undefined, 409);
    }
    return job;
  }

  async progress(projectId: string, jobId: string, progress: AiJobProgress): Promise<AiJobDocument> {
    const job = await this.assertCurrentRunning(projectId, jobId);
    return this.repository.update(job.id, { progress, updated_at: new Date().toISOString() });
  }

  async complete(
    projectId: string,
    jobId: string,
    status: Extract<AiJobStatus, 'succeeded' | 'failed'>,
    summary?: string,
    provenance?: Partial<AiJobProvenance>,
  ): Promise<AiJobDocument> {
    const job = await this.assertCurrentRunning(projectId, jobId);
    const now = new Date().toISOString();
    return this.repository.update(job.id, {
      status,
      summary: summary ?? null,
      provenance: { ...job.provenance, ...provenance, finished_at: now },
      updated_at: now,
    });
  }
}
