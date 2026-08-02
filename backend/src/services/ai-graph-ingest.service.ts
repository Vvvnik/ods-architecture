import { z } from 'zod';

import { AppError } from '../domain/errors.js';
import type { GraphEdgeDocument } from '../domain/graph-edge.js';
import type { GraphNodeDocument } from '../domain/graph-node.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import { isPathIncludedInAnalysis } from './analysis-status-scope.js';
import { isEdgeType, isNodeKind } from './ingest/types.js';
import type { AiJobService } from './ai-job.service.js';

const locationSchema = z.object({
  start_line: z.number().int().optional(),
  start_col: z.number().int().optional(),
  end_line: z.number().int().optional(),
  end_col: z.number().int().optional(),
}).nullable().optional();

const nodeSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  name: z.string().min(1),
  language: z.string().min(1),
  path: z.string().min(1),
  qualified_name: z.string().nullable().optional(),
  location: locationSchema,
  element_id: z.string().nullable().optional(),
  parent_id: z.string().nullable().optional(),
  signature: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
}).passthrough();

const edgeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  language: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  path: z.string().nullable().optional(),
  location: locationSchema,
  metadata: z.record(z.unknown()).nullable().optional(),
}).passthrough();

export class AiGraphIngestService {
  constructor(
    private readonly aiJobService: AiJobService,
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
    private readonly elementRepository: ElementRepository,
  ) {}

  async ingest(projectId: string, jobId: string, body: { analysis_run_id: string; items: unknown[] }): Promise<void> {
    const job = await this.aiJobService.assertCurrentRunningKind(projectId, jobId, 'graph_from_wc');
    if (job.analysis_run_id !== body.analysis_run_id) {
      throw new AppError('ai_job_not_current', 'analysis_run_id does not match the AI job', 409);
    }

    const run = await this.analysisRunRepository.getById(job.analysis_run_id);
    if (
      !run ||
      run.project_id !== projectId ||
      run.graph_builder !== 'ai' ||
      run.status !== 'running'
    ) {
      const message = 'AI analysis run is not accepting ingest';
      await this.failIngest(projectId, jobId, job.analysis_run_id, message);
      throw new AppError('validation_error', message, 400);
    }

    try {
      const elements = await this.elementRepository.loadActiveByProject(projectId);
      const ingestedAt = new Date().toISOString();
      const nodes: GraphNodeDocument[] = [];
      const edges: GraphEdgeDocument[] = [];
      for (const item of body.items) {
        if (typeof item !== 'object' || item === null) {
          throw new Error('Graph item must be an object');
        }
        if ('kind' in item) {
          const node = nodeSchema.parse(item);
          if (!isNodeKind(node.kind)) throw new Error(`Unknown graph node kind: ${node.kind}`);
          if (!isPathIncludedInAnalysis(node.path, elements)) {
            throw new Error(`Node path out of Status scope: ${node.path}`);
          }
          nodes.push({
            ...node,
            project_id: projectId,
            analysis_run_id: job.analysis_run_id,
            parser_id: 'ai-graph',
            kind: node.kind,
            metadata: { ...(node.metadata ?? {}), provenance: 'ai' },
            ingested_at: ingestedAt,
          });
        } else {
          const edge = edgeSchema.parse(item);
          if (!isEdgeType(edge.type)) throw new Error(`Unknown graph edge type: ${edge.type}`);
          if (edge.path != null && edge.path !== '' && !isPathIncludedInAnalysis(edge.path, elements)) {
            throw new Error(`Edge path out of Status scope: ${edge.path}`);
          }
          edges.push({
            ...edge,
            project_id: projectId,
            analysis_run_id: job.analysis_run_id,
            parser_id: 'ai-graph',
            type: edge.type,
            metadata: { ...(edge.metadata ?? {}), provenance: 'ai' },
            ingested_at: ingestedAt,
          });
        }
      }
      await this.graphNodeRepository.bulkUpsert(nodes);
      await this.graphEdgeRepository.bulkUpsert(edges);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid graph ingest';
      await this.failIngest(projectId, jobId, job.analysis_run_id, message);
      throw new AppError('validation_error', message, 400);
    }
  }

  private async failIngest(projectId: string, jobId: string, analysisRunId: string, message: string): Promise<void> {
    await this.analysisRunRepository.update(analysisRunId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      ingest_status: 'failed',
      ingest_errors: [{ parser_id: 'ai-graph', message }],
      last_error_message: message,
    });
    await this.aiJobService.complete(projectId, jobId, 'failed', message);
  }
}
