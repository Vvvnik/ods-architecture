import type { AnalysisRunRepository } from '../../repositories/analysis-run.repository.js';
import type { ElementRepository } from '../../repositories/element.repository.js';
import type { GraphEdgeRepository } from '../../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../../repositories/graph-node.repository.js';
import type { ParserEnvelopeRepository } from '../../repositories/parser-envelope.repository.js';
import type { ParserEnvelopeIngestInput } from '../../domain/parser-envelope.js';
import type { ChangeSetService } from '../change-set.service.js';
import type { ParserRegistryService } from '../parser-registry.service.js';
import type { SyncService } from '../sync.service.js';
import type { GraphNodeInput, GraphEdgeInput, IngestContext } from './types.js';
import type { IngestRegistryService } from './ingest-registry.service.js';
import { findBestBootstrapSourceRunId } from '../graph-run-resolver.js';

const ARTIFACT_PARSER_IDS = new Set([
  'compose',
  'appsettings',
  'openapi',
  'dotnet-project',
  'bus-rabbit',
  'bus-kafka',
  'ts-api-routes',
  'dotnet-api-routes',
  'ts-http-calls',
  'maven-project',
  'gradle-project',
  'spring-config',
  'java-api-routes',
  'java-http-calls',
  'react-ui',
  'angular-ui',
  'angularjs-ui',
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

  /**
   * Ingest a native extract from memory. Preferred path: orchestrator never
   * persists `model` to Elasticsearch.
   */
  async ingestNative(envelope: ParserEnvelopeIngestInput): Promise<void> {
    const run = await this.analysisRunRepository.getById(envelope.analysis_run_id);
    if (!run) {
      return;
    }

    if (this.syncService?.isRunning(envelope.project_id)) {
      await this.appendIngestError(
        run.id,
        envelope.parser_id,
        'Synchronization in progress — ingest skipped',
      );
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
        'Ingest adapter for parser not found',
      );
      return;
    }

    if (!adapter.supported_schema_versions.includes(envelope.schema_version)) {
      await this.appendIngestError(
        run.id,
        envelope.parser_id,
        `Unsupported schema_version: ${envelope.schema_version}`,
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

      const composeServiceNames = await this.listComposeServiceNames(
        envelope.project_id,
        envelope.analysis_run_id,
      );
      const codeHttpEndpoints =
        envelope.parser_id === 'openapi'
          ? await this.listCodeHttpEndpoints(envelope.project_id, envelope.analysis_run_id)
          : undefined;
      const ctxWithCompose: IngestContext = {
        ...ctx,
        compose_service_names: composeServiceNames,
        code_http_endpoints: codeHttpEndpoints,
      };

      const { nodes, edges } = adapter.transform(envelope.model, ctxWithCompose);
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
      const message = error instanceof Error ? error.message : 'Ingest failed';
      await this.appendIngestError(run.id, envelope.parser_id, message);
      throw error instanceof Error ? error : new Error(message);
    }
  }

  /** @deprecated Prefer ingestNative — ES envelopes are metadata-only. */
  async ingestEnvelope(envelopeId: string): Promise<void> {
    const envelope = await this.parserEnvelopeRepository.getById(envelopeId);
    if (!envelope) {
      return;
    }
    if (!envelope.model || Object.keys(envelope.model).length === 0) {
      return;
    }
    await this.ingestNative(envelope);
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
        'Synchronization in progress — graph node deletion skipped',
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
      const message = error instanceof Error ? error.message : 'Failed to delete graph nodes';
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

    if (ingest_status === 'success' || ingest_status === 'partial') {
      await this.graphNodeRepository.deleteByProjectExceptRun(run.project_id, analysisRunId);
      await this.graphEdgeRepository.deleteByProjectExceptRun(run.project_id, analysisRunId);
    }
  }

  private buildContext(
    envelope: ParserEnvelopeIngestInput,
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

  private async listComposeServiceNames(
    projectId: string,
    analysisRunId: string,
  ): Promise<string[]> {
    const { items } = await this.graphNodeRepository.listByKinds(
      projectId,
      analysisRunId,
      ['service'],
      { limit: 500, offset: 0 },
    );
    const names = new Set<string>();
    for (const node of items) {
      if (!node.id.startsWith('compose:service:')) continue;
      const fromId = node.id.split('#')[1];
      if (fromId) names.add(fromId);
      else if (node.name) names.add(node.name);
    }
    return [...names];
  }

  private async listCodeHttpEndpoints(
    projectId: string,
    analysisRunId: string,
  ): Promise<Array<{ id: string; method: string; path: string; service_name?: string }>> {
    const { items } = await this.graphNodeRepository.listByKinds(
      projectId,
      analysisRunId,
      ['http_endpoint'],
      { limit: 2000, offset: 0 },
    );
    const out: Array<{ id: string; method: string; path: string; service_name?: string }> = [];
    for (const node of items) {
      if (!node.id || node.parser_id === 'openapi') continue;
      const meta = (node.metadata ?? {}) as Record<string, unknown>;
      const source = meta.source;
      const isCode =
        source === 'code' ||
        source === 'both' ||
        (typeof node.parser_id === 'string' && node.parser_id.includes('api-routes'));
      if (!isCode) continue;
      const method = String(node.signature ?? meta.http_method ?? '').toUpperCase();
      const path = String(meta.http_path ?? node.name ?? '');
      if (!method || !path) continue;
      out.push({
        id: node.id,
        method,
        path,
        service_name: typeof meta.service_name === 'string' ? meta.service_name : undefined,
      });
    }
    return out;
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

    if (parserId === 'react-ui') {
      return this.changeSetService.pathsForArtifact(paths, 'frontend-ui');
    }

    if (parserId === 'angular-ui') {
      return this.changeSetService.pathsForArtifact(paths, 'frontend-angular');
    }

    if (parserId === 'angularjs-ui') {
      return this.changeSetService.pathsForArtifact(paths, 'frontend-angularjs');
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
    // element_id is captured at ingest time by path in ods-elements.
    // If the file is later deleted or moved during sync, graph nodes retain
    // the stale element_id until the next ingest (delete/upsert by path).
    // UI navigation prefers path (highlightPath) over element_id.
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

  return edges.filter((edge) => {
    if (!edge.from || !edge.to) {
      return false;
    }
    // System edges often race compose vs api parsers (parallel ingest).
    // Keep cross-parser links; view loader resolves missing ends.
    if (edge.type === 'http_calls' || edge.type === 'exposes') {
      return true;
    }
    return knownNodeIds.has(edge.from) && knownNodeIds.has(edge.to);
  });
}
