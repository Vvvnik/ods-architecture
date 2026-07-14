import type { AnalysisRunRepository } from '../../repositories/analysis-run.repository.js';
import type { ElementRepository } from '../../repositories/element.repository.js';
import type { GraphEdgeRepository } from '../../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../../repositories/graph-node.repository.js';
import type { ParserEnvelopeRepository } from '../../repositories/parser-envelope.repository.js';
import type { ChangeSetService } from '../change-set.service.js';
import type { ParserRegistryService } from '../parser-registry.service.js';
import type { SyncService } from '../sync.service.js';
import type { GraphNodeInput, GraphEdgeInput } from './types.js';
import type { IngestRegistryService } from './ingest-registry.service.js';
import { findBestBootstrapSourceRunId } from '../graph-run-resolver.js';

const ARTIFACT_PARSER_IDS = new Set([
  'compose',
  'appsettings',
  'openapi',
  'dotnet-project',
  'bus-rabbit',
  'bus-kafka',
]);

export class IngestService {
  private readonly bootstrappedRuns = new Set<string>();

  constructor(
    private readonly parserEnvelopeRepository: ParserEnvelopeRepository,
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
    private readonly elementRepository: ElementRepository,
    private readonly ingestRegistry: IngestRegistryService,
    private readonly syncService?: SyncService,
    private readonly changeSetService?: ChangeSetService,
    private readonly parserRegistry?: ParserRegistryService,
  ) {}

  async ingestEnvelope(envelopeId: string): Promise<void> {
    const envelope = await this.parserEnvelopeRepository.getById(envelopeId);
    if (!envelope) {
      return;
    }

    const run = await this.analysisRunRepository.getById(envelope.analysis_run_id);
    if (!run) {
      return;
    }

    if (this.syncService?.isRunning(envelope.project_id)) {
      await this.appendIngestError(run.id, envelope.parser_id, 'Синхронизация в процессе — ingest пропущен');
      return;
    }

    if (!run.ingest_status || run.ingest_status === 'pending') {
      await this.analysisRunRepository.patchIngestMetadata(run.id, { ingest_status: 'running' });
    }

    const adapter = this.ingestRegistry.get(envelope.parser_id);
    if (!adapter) {
      await this.appendIngestError(
        run.id,
        envelope.parser_id,
        'Адаптер ingest для парсера не найден',
      );
      return;
    }

    if (!adapter.supported_schema_versions.includes(envelope.schema_version)) {
      await this.appendIngestError(
        run.id,
        envelope.parser_id,
        `Неподдерживаемая schema_version: ${envelope.schema_version}`,
      );
      return;
    }

    const ctx = this.buildContext(envelope, run);
    const deletePaths = [...new Set([...ctx.affected_paths, ...ctx.deleted_paths])];

    try {
      await this.ensureIncrementalBootstrap(envelope.project_id, run);

      await this.graphEdgeRepository.deleteByPaths({
        projectId: envelope.project_id,
        analysisRunId: envelope.analysis_run_id,
        parserId: envelope.parser_id,
        paths: deletePaths,
      });
      await this.graphNodeRepository.deleteByPaths({
        projectId: envelope.project_id,
        analysisRunId: envelope.analysis_run_id,
        parserId: envelope.parser_id,
        paths: deletePaths,
      });

      const onlyDeleted =
        envelope.files_analyzed.length === 0 &&
        ctx.deleted_paths.length > 0 &&
        ctx.affected_paths.length === 0;

      if (onlyDeleted) {
        return;
      }

      const { nodes, edges } = adapter.transform(envelope.model, ctx);
      const existingNodeIds = await this.graphNodeRepository.listLogicalIdsByProjectAndRun(
        envelope.project_id,
        envelope.analysis_run_id,
      );
      const filteredEdges = filterEdgesWithKnownEndpoints(nodes, edges, existingNodeIds);
      const ingestedAt = new Date().toISOString();

      const nodesWithIds = nodes.filter(
        (node): node is GraphNodeInput & { id: string } => typeof node.id === 'string',
      );
      const nodesWithElements = await this.resolveElementIds(
        envelope.project_id,
        nodesWithIds,
        ingestedAt,
      );
      const edgesWithTimestamp = filteredEdges
        .filter((edge): edge is typeof edge & { id: string } => typeof edge.id === 'string')
        .map((edge) => ({
          ...edge,
          ingested_at: ingestedAt,
        }));

      await this.graphNodeRepository.bulkUpsert(nodesWithElements);
      await this.graphEdgeRepository.bulkUpsert(edgesWithTimestamp);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка ingest';
      await this.appendIngestError(run.id, envelope.parser_id, message);
    }
  }

  async ingestDeletedPaths(
    projectId: string,
    analysisRunId: string,
    parserId: string,
    deletedPaths: string[],
  ): Promise<void> {
    if (deletedPaths.length === 0) {
      return;
    }

    const run = await this.analysisRunRepository.getById(analysisRunId);
    if (!run) {
      return;
    }

    if (this.syncService?.isRunning(projectId)) {
      await this.appendIngestError(
        analysisRunId,
        parserId,
        'Синхронизация в процессе — удаление узлов графа пропущено',
      );
      return;
    }

    if (!run.ingest_status || run.ingest_status === 'pending') {
      await this.analysisRunRepository.patchIngestMetadata(analysisRunId, { ingest_status: 'running' });
    }

    try {
      await this.ensureIncrementalBootstrap(projectId, run);

      await this.graphEdgeRepository.deleteByPaths({
        projectId,
        analysisRunId,
        parserId,
        paths: deletedPaths,
      });
      await this.graphNodeRepository.deleteByPaths({
        projectId,
        analysisRunId,
        parserId,
        paths: deletedPaths,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка удаления узлов графа';
      await this.appendIngestError(analysisRunId, parserId, message);
    }
  }

  async completeRun(analysisRunId: string): Promise<void> {
    const run = await this.analysisRunRepository.getById(analysisRunId);
    if (!run) {
      return;
    }

    const errors = run.ingest_errors ?? [];
    const nodeCount = await this.graphNodeRepository.countByProjectAndRun(
      run.project_id,
      analysisRunId,
    );
    const parserSucceeded = (run.parser_results ?? []).some((result) => result.status === 'success');

    let ingest_status: string;
    if (errors.length > 0) {
      ingest_status = 'partial';
    } else if (nodeCount === 0 && parserSucceeded) {
      ingest_status = 'partial';
    } else {
      ingest_status = 'success';
    }

    await this.analysisRunRepository.patchIngestMetadata(analysisRunId, {
      ingest_status,
      ingest_completed_at: new Date().toISOString(),
    });
  }

  private buildContext(
    envelope: NonNullable<Awaited<ReturnType<ParserEnvelopeRepository['getById']>>>,
    run: NonNullable<Awaited<ReturnType<AnalysisRunRepository['getById']>>>,
  ): IngestContext {
    const changeSet = run.change_set;
    const incremental = changeSet?.incremental ?? false;

    if (!incremental) {
      return {
        project_id: envelope.project_id,
        analysis_run_id: envelope.analysis_run_id,
        parser_id: envelope.parser_id,
        schema_version: envelope.schema_version,
        files_analyzed: envelope.files_analyzed,
        incremental: false,
        affected_paths: envelope.files_analyzed,
        deleted_paths: [],
      };
    }

    const added = changeSet?.added ?? [];
    const modified = changeSet?.modified ?? [];
    const deleted = changeSet?.deleted ?? [];

    const affected_paths = this.pathsForParser(
      [...new Set([...envelope.files_analyzed, ...added, ...modified])],
      envelope.parser_id,
    );
    const deleted_paths = this.pathsForParser(deleted, envelope.parser_id);

    return {
      project_id: envelope.project_id,
      analysis_run_id: envelope.analysis_run_id,
      parser_id: envelope.parser_id,
      schema_version: envelope.schema_version,
      files_analyzed: envelope.files_analyzed,
      incremental: true,
      affected_paths,
      deleted_paths,
    };
  }

  private resolveParserLanguages(parserId: string): string[] {
    const manifest = this.parserRegistry?.getManifest(parserId);
    return manifest?.languages ?? [parserId];
  }

  private pathsForParser(paths: string[], parserId: string): string[] {
    if (!this.changeSetService) {
      return [...new Set(paths)].sort((a, b) => a.localeCompare(b));
    }

    if (parserId === 'bus-rabbit' || parserId === 'bus-kafka') {
      return this.changeSetService.pathsForArtifact(paths, 'bus');
    }

    if (ARTIFACT_PARSER_IDS.has(parserId)) {
      return this.changeSetService.pathsForArtifact(paths, parserId);
    }

    const parserLanguages = this.resolveParserLanguages(parserId);
    if (parserLanguages.length === 0) {
      return [...new Set(paths)].sort((a, b) => a.localeCompare(b));
    }

    const matched = new Set<string>();
    for (const language of parserLanguages) {
      for (const path of this.changeSetService.pathsForLanguage(paths, language)) {
        matched.add(path);
      }
    }

    return [...matched].sort((a, b) => a.localeCompare(b));
  }

  private async ensureIncrementalBootstrap(
    projectId: string,
    run: NonNullable<Awaited<ReturnType<AnalysisRunRepository['getById']>>>,
  ): Promise<void> {
    if (!run.change_set?.incremental) {
      return;
    }

    if (this.bootstrappedRuns.has(run.id)) {
      return;
    }

    const existingCount = await this.graphNodeRepository.countByProjectAndRun(projectId, run.id);
    if (existingCount > 0) {
      this.bootstrappedRuns.add(run.id);
      return;
    }

    const previousRunId = await findBestBootstrapSourceRunId(
      await this.analysisRunRepository.listByProjectId(projectId, 50),
      run.id,
      (runId) => this.graphNodeRepository.countByProjectAndRun(projectId, runId),
    );
    if (!previousRunId) {
      this.bootstrappedRuns.add(run.id);
      return;
    }

    await this.graphNodeRepository.copyFromRun(projectId, previousRunId, run.id);
    await this.graphEdgeRepository.copyFromRun(projectId, previousRunId, run.id);
    this.bootstrappedRuns.add(run.id);
  }

  private async resolveElementIds(
    projectId: string,
    nodes: Array<GraphNodeInput & { id: string }>,
    ingestedAt: string,
  ) {
    // element_id фиксируется на момент ingest по path в ods-elements.
    // Если файл позже удалён или перемещён при sync, узлы графа сохраняют
    // устаревший element_id до следующего ingest (delete/upsert по path).
    // UI навигации предпочитает path (highlightPath), а не element_id.
    const pathCache = new Map<string, string | null>();

    const resolved = [];
    for (const node of nodes) {
      let elementId = pathCache.get(node.path);
      if (elementId === undefined) {
        const element = await this.elementRepository.findByPath(projectId, node.path);
        elementId = element?.id ?? null;
        pathCache.set(node.path, elementId);
      }

      resolved.push({
        ...node,
        element_id: elementId,
        ingested_at: ingestedAt,
      });
    }

    return resolved;
  }

  private async appendIngestError(
    runId: string,
    parserId: string,
    message: string,
  ): Promise<void> {
    const run = await this.analysisRunRepository.getById(runId);
    if (!run) {
      return;
    }

    const existing = run.ingest_errors ?? [];
    await this.analysisRunRepository.patchIngestMetadata(runId, {
      ingest_errors: [...existing, { parser_id: parserId, message }],
    });
  }
}

function filterEdgesWithKnownEndpoints(
  nodes: GraphNodeInput[],
  edges: GraphEdgeInput[],
  existingNodeIds: Set<string>,
): GraphEdgeInput[] {
  const knownNodeIds = new Set(existingNodeIds);
  for (const node of nodes) {
    if (node.id) {
      knownNodeIds.add(node.id);
    }
  }

  return edges.filter(
    (edge) => Boolean(edge.from && edge.to && knownNodeIds.has(edge.from) && knownNodeIds.has(edge.to)),
  );
}
