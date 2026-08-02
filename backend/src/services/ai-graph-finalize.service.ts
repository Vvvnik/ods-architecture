import type { AiJobDocument, AiJobProvenance } from '../domain/ai-job.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import type { AiJobService } from './ai-job.service.js';

export class AiGraphFinalizeService {
  constructor(
    private readonly aiJobService: AiJobService,
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
  ) {}

  async complete(
    projectId: string,
    jobId: string,
    status: 'succeeded' | 'failed',
    summary?: string,
    provenance?: Partial<AiJobProvenance>,
  ): Promise<AiJobDocument> {
    const job = await this.aiJobService.assertCurrentRunning(projectId, jobId);
    if (job.kind !== 'graph_from_wc') {
      return this.aiJobService.complete(projectId, jobId, status, summary, provenance);
    }
    if (status === 'failed') {
      await this.markRunFailed(job.analysis_run_id, summary ?? 'AI graph job failed');
      return this.aiJobService.complete(projectId, jobId, 'failed', summary, provenance);
    }

    const run = await this.analysisRunRepository.getById(job.analysis_run_id);
    const nodeCount = await this.graphNodeRepository.countByProjectAndRun(projectId, job.analysis_run_id);
    const ingestErrors = run?.ingest_errors ?? [];
    if (
      !run ||
      run.project_id !== projectId ||
      run.graph_builder !== 'ai' ||
      run.status !== 'running' ||
      ingestErrors.length > 0 ||
      nodeCount === 0
    ) {
      const reason =
        ingestErrors[0]?.message ??
        (nodeCount === 0
          ? 'AI graph ingest produced zero nodes'
          : run?.status !== 'running'
            ? 'AI analysis run is not running (interrupted or already finished)'
            : 'AI analysis run is unavailable');
      await this.markRunFailed(job.analysis_run_id, reason);
      return this.aiJobService.complete(projectId, jobId, 'failed', reason, provenance);
    }

    const now = new Date().toISOString();
    await this.analysisRunRepository.update(job.analysis_run_id, {
      status: 'success',
      completed_at: now,
      ingest_status: 'success',
      ingest_completed_at: now,
      last_error_message: null,
      progress_phase: 'done',
      progress_active_parser_id: null,
      progress_parsers_completed: 1,
      progress_parsers_total: 1,
      progress_updated_at: now,
    });
    await this.graphNodeRepository.deleteByProjectExceptRun(projectId, job.analysis_run_id);
    await this.graphEdgeRepository.deleteByProjectExceptRun(projectId, job.analysis_run_id);
    return this.aiJobService.complete(projectId, jobId, 'succeeded', summary, provenance);
  }

  private async markRunFailed(analysisRunId: string, message: string): Promise<void> {
    await this.analysisRunRepository.update(analysisRunId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      ingest_status: 'failed',
      last_error_message: message,
    });
  }
}
