import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { z } from 'zod';

import type { AppConfig } from '../config.js';
import { AppError } from '../domain/errors.js';
import type {
  AnalysisRunDocument,
  ChangeSet,
  ParserResultSummary,
} from '../domain/analysis-run.js';
import type { ArtifactEntry, LanguageEntry } from '../domain/language-report.js';
import type { ParserEnvelopePayload } from '../domain/parser-envelope.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { LanguageReportRepository } from '../repositories/language-report.repository.js';
import type { ParserEnvelopeRepository } from '../repositories/parser-envelope.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { ChangeSetService } from './change-set.service.js';
import type { FileInventoryService } from './file-inventory.service.js';
import type { IngestService } from './ingest/ingest.service.js';
import type { ParserRegistryService } from './parser-registry.service.js';
import type { SyncService } from './sync.service.js';
import type { AgentPromptService } from './agent-prompt.service.js';
import type { AnalysisProgressPhase } from '../domain/analysis-run.js';
import { chunkFiles } from './analysis-file-chunks.js';
import { isGraphReadyRun } from './graph-run-resolver.js';
import { ParserWorkerSession } from './parser-worker-session.js';

const envelopeSchema = z.object({
  parser_id: z.string(),
  schema_version: z.string(),
  project_id: z.string(),
  analysis_run_id: z.string(),
  generated_at: z.string(),
  files_analyzed: z.array(z.string()),
  model: z.record(z.unknown()),
});

export class AnalysisOrchestratorService {
  private readonly locks = new Set<string>();

  constructor(
    private readonly config: AppConfig,
    private readonly projectRepository: ProjectRepository,
    private readonly languageReportRepository: LanguageReportRepository,
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly parserEnvelopeRepository: ParserEnvelopeRepository,
    private readonly parserRegistry: ParserRegistryService,
    private readonly changeSetService: ChangeSetService,
    private readonly syncService: SyncService,
    private readonly ingestService?: IngestService,
    private readonly fileInventoryService?: FileInventoryService,
    private readonly agentPromptService?: AgentPromptService,
  ) {}

  isRunning(projectId: string): boolean {
    return this.locks.has(projectId);
  }

  async startRun(
    projectId: string,
    languageReportId: string,
    confirmedChangeSet: boolean,
    options?: { forceFull?: boolean },
  ): Promise<AnalysisRunDocument> {
    if (!confirmedChangeSet) {
      throw new AppError('validation_error', 'confirmed_change_set is required', 400);
    }

    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    if (this.syncService.isRunning(projectId) || project.sync_status === 'running') {
      throw new AppError('sync_in_progress', undefined, 409);
    }

    if (this.locks.has(projectId)) {
      throw new AppError('analysis_in_progress', undefined, 409);
    }

    const existingRun = await this.analysisRunRepository.findRunningByProjectId(projectId);
    if (existingRun) {
      throw new AppError('analysis_in_progress', undefined, 409);
    }

    const report = await this.languageReportRepository.getById(languageReportId);
    if (!report || report.project_id !== projectId) {
      throw new AppError('language_report_not_found', undefined, 404);
    }

    if (project.last_sync_at) {
      const matchesCurrentSync =
        report.sync_id === project.last_sync_at ||
        (!report.sync_id && report.detected_at >= project.last_sync_at);
      if (!matchesCurrentSync) {
        throw new AppError('language_report_not_found', undefined, 404);
      }
    }

    const cached = this.fileInventoryService?.getCached(projectId);
    let changeSet = await this.changeSetService.buildChangeSet(
      projectId,
      project.working_copy_root,
      cached?.files,
    );
    let analysisPaths: string[] | undefined;
    if (this.fileInventoryService) {
      const inventory =
        cached ??
        (await this.fileInventoryService.buildFileInventory(
          projectId,
          project.working_copy_root,
          this.config.ANALYSIS_DETECTOR_DENYLIST,
        ));
      analysisPaths = (
        await this.fileInventoryService.getAnalysisFiles(projectId, inventory.files)
      ).map((file) => file.path);
      const analysisPathSet = new Set(analysisPaths);
      changeSet = {
        ...changeSet,
        added: changeSet.added.filter((path) => analysisPathSet.has(path)),
        modified: changeSet.modified.filter((path) => analysisPathSet.has(path)),
      };
    }

    if (options?.forceFull) {
      const paths = analysisPaths ?? [...changeSet.added, ...changeSet.modified];
      changeSet = {
        project_id: projectId,
        incremental: false,
        added: [...paths].sort((a, b) => a.localeCompare(b)),
        modified: [],
        deleted: [],
      };
    }

    const run = await this.analysisRunRepository.create({
      project_id: projectId,
      language_report_id: languageReportId,
      status: 'pending',
      started_at: new Date().toISOString(),
      completed_at: null,
      incremental: changeSet.incremental,
      graph_builder: 'parsers',
      change_set: changeSet,
      parser_results: [],
      last_error_message: null,
      progress_phase: 'queued',
      progress_active_parser_id: null,
      progress_parsers_completed: 0,
      progress_parsers_total: 0,
      progress_updated_at: new Date().toISOString(),
    });

    this.locks.add(projectId);
    void this.executeRun(project, report.languages, report.artifacts ?? [], run, changeSet);

    return run;
  }

  private async executeRun(
    project: NonNullable<Awaited<ReturnType<ProjectRepository['getById']>>>,
    languages: LanguageEntry[],
    artifacts: ArtifactEntry[],
    run: AnalysisRunDocument,
    changeSet: ChangeSet,
  ): Promise<void> {
    try {
      await this.parserRegistry.ensureLoaded();

      type Job = {
        parserId: string;
        files: string[];
        deleted: string[];
      };

      const jobs: Job[] = [];
      const spawnedParserIds = new Set<string>();
      const earlyResults: ParserResultSummary[] = [];

      const spawnOrder = [...languages].sort((a, b) => {
        if (b.file_count !== a.file_count) {
          return b.file_count - a.file_count;
        }
        return a.language.localeCompare(b.language);
      });

      for (const entry of spawnOrder) {
        if (!entry.parser_id || entry.parser_status === 'missing') {
          if (entry.parser_id) {
            earlyResults.push({
              parser_id: entry.parser_id,
              status: 'missing',
              error_message: null,
            });
          }
          continue;
        }
        if (spawnedParserIds.has(entry.parser_id)) {
          continue;
        }
        spawnedParserIds.add(entry.parser_id);

        const manifest = this.parserRegistry.getManifest(entry.parser_id);
        if (!manifest) {
          earlyResults.push({
            parser_id: entry.parser_id,
            status: 'missing',
            error_message: 'Parser manifest not found',
          });
          continue;
        }

        const parserChangeSet = this.changeSetService.resolveParserChangeSet(
          changeSet,
          entry.language,
        );
        const files = this.resolveFilesForParser(entry, changeSet);

        if (files.length === 0) {
          if (changeSet.incremental && parserChangeSet.deleted.length > 0) {
            this.logDeletedPaths(entry.parser_id, parserChangeSet.deleted);
            await this.ingestService?.ingestDeletedPaths(
              project.id,
              run.id,
              entry.parser_id,
              parserChangeSet.deleted,
            );
          }
          earlyResults.push({
            parser_id: entry.parser_id,
            status: 'skipped',
            error_message: null,
          });
          continue;
        }

        if (changeSet.incremental && parserChangeSet.deleted.length > 0) {
          this.logDeletedPaths(entry.parser_id, parserChangeSet.deleted);
        }

        jobs.push({
          parserId: entry.parser_id,
          files,
          deleted: parserChangeSet.deleted,
        });
      }

      const artifactOrder = [...artifacts].sort((a, b) => {
        if (a.artifact_type === 'compose' && b.artifact_type !== 'compose') {
          return -1;
        }
        if (b.artifact_type === 'compose' && a.artifact_type !== 'compose') {
          return 1;
        }
        // OpenAPI after code routes so documents can merge onto code endpoints.
        const aOpen = a.parser_id === 'openapi' || a.artifact_type === 'openapi';
        const bOpen = b.parser_id === 'openapi' || b.artifact_type === 'openapi';
        const aRoutes = typeof a.parser_id === 'string' && a.parser_id.endsWith('api-routes');
        const bRoutes = typeof b.parser_id === 'string' && b.parser_id.endsWith('api-routes');
        const aGrpcProto = a.parser_id === 'grpc-proto' || a.artifact_type === 'grpc-proto';
        const bGrpcProto = b.parser_id === 'grpc-proto' || b.artifact_type === 'grpc-proto';
        const aGrpcCalls = typeof a.parser_id === 'string' && a.parser_id.endsWith('grpc-calls');
        const bGrpcCalls = typeof b.parser_id === 'string' && b.parser_id.endsWith('grpc-calls');
        if (aOpen && bRoutes) return 1;
        if (bOpen && aRoutes) return -1;
        if (aGrpcProto && bGrpcCalls) return -1;
        if (bGrpcProto && aGrpcCalls) return 1;
        if (aOpen && !bOpen) return 1;
        if (bOpen && !aOpen) return -1;
        if (b.file_count !== a.file_count) {
          return b.file_count - a.file_count;
        }
        return a.artifact_type.localeCompare(b.artifact_type);
      });

      for (const entry of artifactOrder) {
        if (!entry.parser_id || entry.parser_status === 'missing' || entry.file_count === 0) {
          if (entry.parser_id) {
            earlyResults.push({
              parser_id: entry.parser_id,
              status: entry.parser_status === 'missing' ? 'missing' : 'skipped',
              error_message: null,
            });
          }
          continue;
        }
        if (spawnedParserIds.has(entry.parser_id)) {
          continue;
        }
        spawnedParserIds.add(entry.parser_id);

        const manifest = this.parserRegistry.getManifest(entry.parser_id);
        if (!manifest) {
          earlyResults.push({
            parser_id: entry.parser_id,
            status: 'missing',
            error_message: 'Parser manifest not found',
          });
          continue;
        }

        const parserChangeSet = this.changeSetService.resolveArtifactChangeSet(
          changeSet,
          entry.artifact_type,
        );
        const files = this.resolveArtifactFilesForParser(entry, changeSet);

        if (files.length === 0) {
          if (changeSet.incremental && parserChangeSet.deleted.length > 0) {
            this.logDeletedPaths(entry.parser_id, parserChangeSet.deleted);
            await this.ingestService?.ingestDeletedPaths(
              project.id,
              run.id,
              entry.parser_id,
              parserChangeSet.deleted,
            );
          }
          earlyResults.push({
            parser_id: entry.parser_id,
            status: 'skipped',
            error_message: null,
          });
          continue;
        }

        if (changeSet.incremental && parserChangeSet.deleted.length > 0) {
          this.logDeletedPaths(entry.parser_id, parserChangeSet.deleted);
        }

        jobs.push({
          parserId: entry.parser_id,
          files,
          deleted: parserChangeSet.deleted,
        });
      }

      const plannedTotal = earlyResults.length + jobs.length;
      await this.patchProgress(run.id, {
        progress_phase: 'parsing',
        progress_active_parser_id: jobs[0]?.parserId ?? null,
        progress_parsers_completed: earlyResults.length,
        progress_parsers_total: plannedTotal,
      });
      await this.analysisRunRepository.update(run.id, { status: 'running' });

      const spawnResults: Array<ParserResultSummary | undefined> = new Array(jobs.length);
      const maxParallel = Math.max(1, this.config.ANALYSIS_MAX_PARALLEL_PARSERS);
      let nextIndex = 0;
      let completed = earlyResults.length;

      const runJob = async (jobIndex: number, job: Job): Promise<void> => {
        const manifest = this.parserRegistry.getManifest(job.parserId);
        if (!manifest) {
          spawnResults[jobIndex] = {
            parser_id: job.parserId,
            status: 'missing',
            error_message: 'Parser manifest not found',
          };
          completed += 1;
          return;
        }
        await this.patchProgress(run.id, {
          progress_phase: 'parsing',
          progress_active_parser_id: job.parserId,
          progress_parsers_completed: completed,
          progress_parsers_total: plannedTotal,
        });
        const result = await this.spawnParser(
          manifest,
          project.id,
          project.working_copy_root,
          run.id,
          job.files,
        );
        spawnResults[jobIndex] = result;
        completed += 1;
        await this.patchProgress(run.id, {
          progress_phase: 'parsing',
          progress_active_parser_id: job.parserId,
          progress_parsers_completed: completed,
          progress_parsers_total: plannedTotal,
        });
      };

      const workers: Promise<void>[] = [];
      for (let w = 0; w < Math.min(maxParallel, jobs.length); w += 1) {
        workers.push(
          (async () => {
            while (true) {
              const i = nextIndex;
              nextIndex += 1;
              if (i >= jobs.length) {
                return;
              }
              await runJob(i, jobs[i]!);
            }
          })(),
        );
      }
      await Promise.all(workers);

      const parserResults = [
        ...earlyResults,
        ...spawnResults.filter((r): r is ParserResultSummary => r !== undefined),
      ];

      await this.patchProgress(run.id, {
        progress_phase: 'ingest',
        progress_active_parser_id: null,
        progress_parsers_completed: plannedTotal,
        progress_parsers_total: plannedTotal,
      });

      const hasSuccess = parserResults.some((r) => r.status === 'success');
      const hasFailure = parserResults.some(
        (r) => r.status === 'failed' || r.status === 'missing',
      );

      let status: AnalysisRunDocument['status'] = 'failed';
      if (hasSuccess && hasFailure) {
        status = 'partial';
      } else if (hasSuccess) {
        status = 'success';
      } else if (parserResults.every((r) => r.status === 'skipped')) {
        status = 'success';
      } else if (parserResults.every((r) => r.status === 'missing' || r.status === 'skipped')) {
        status = 'partial';
      }

      const lastError = parserResults.find((r) => r.error_message)?.error_message ?? null;

      await this.analysisRunRepository.update(run.id, {
        status,
        completed_at: new Date().toISOString(),
        parser_results: parserResults,
        last_error_message: lastError,
        progress_phase: 'done' satisfies AnalysisProgressPhase,
        progress_active_parser_id: null,
        progress_parsers_completed: plannedTotal,
        progress_parsers_total: plannedTotal,
        progress_updated_at: new Date().toISOString(),
      });

      if (status === 'success' || status === 'partial') {
        const cachedFiles = this.fileInventoryService?.getCached(project.id)?.files;
        try {
          await this.changeSetService.captureSnapshot(
            project.id,
            project.working_copy_root,
            cachedFiles,
          );
        } catch (snapshotError) {
          // Snapshot is for incremental diffs only — do not fail a usable graph run.
          console.warn(
            `[analysis-orchestrator] sync snapshot failed for project ${project.id}:`,
            snapshotError instanceof Error ? snapshotError.message : snapshotError,
          );
        }
        await this.ingestService?.completeRun(run.id);
        try {
          const completed = await this.analysisRunRepository.getById(run.id);
          if (
            completed &&
            isGraphReadyRun(completed) &&
            (completed.graph_builder ?? 'parsers') === 'parsers'
          ) {
            await this.agentPromptService?.ensureCodeSeeded(project.id, run.id);
          }
        } catch (codeSeedError) {
          console.warn(
            `[analysis-orchestrator] AGENT-CODE seed failed for project ${project.id}:`,
            codeSeedError instanceof Error ? codeSeedError.message : codeSeedError,
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Analysis failed';
      await this.analysisRunRepository.update(run.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        last_error_message: message,
        progress_phase: 'done',
        progress_updated_at: new Date().toISOString(),
      });
    } finally {
      this.locks.delete(project.id);
    }
  }

  private async patchProgress(
    runId: string,
    patch: {
      progress_phase: AnalysisProgressPhase;
      progress_active_parser_id: string | null;
      progress_parsers_completed: number;
      progress_parsers_total: number;
    },
  ): Promise<void> {
    await this.analysisRunRepository.update(runId, {
      ...patch,
      progress_updated_at: new Date().toISOString(),
    });
  }

  private resolveFilesForParser(entry: LanguageEntry, changeSet: ChangeSet): string[] {
    if (!changeSet.incremental) {
      return this.changeSetService.pathsForLanguage(changeSet.added, entry.language);
    }
    return this.changeSetService.resolveParserChangeSet(changeSet, entry.language).spawn;
  }

  private resolveArtifactFilesForParser(entry: ArtifactEntry, changeSet: ChangeSet): string[] {
    if (!changeSet.incremental) {
      return this.changeSetService.pathsForArtifact(changeSet.added, entry.artifact_type);
    }
    return this.changeSetService.resolveArtifactChangeSet(changeSet, entry.artifact_type).spawn;
  }

  private logDeletedPaths(parserId: string, deletedPaths: string[]): void {
    console.info(
      `[analysis-orchestrator] deleted paths for parser ${parserId}: ${deletedPaths.join(', ')}`,
    );
  }

  private async spawnParser(
    manifest: NonNullable<ReturnType<ParserRegistryService['getManifest']>>,
    projectId: string,
    workingCopyRoot: string,
    analysisRunId: string,
    files: string[],
  ): Promise<ParserResultSummary> {
    const chunks = chunkFiles(files, this.config.ANALYSIS_PARSER_FILE_CHUNK_SIZE);
    if (chunks.length === 0) {
      return {
        parser_id: manifest.id,
        status: 'skipped',
        error_message: null,
      };
    }

    if (manifest.supports_ods_worker === true && chunks.length > 1) {
      const workerResult = await this.spawnParserWithWorker(
        manifest,
        projectId,
        workingCopyRoot,
        analysisRunId,
        chunks,
      );
      if (workerResult.status === 'success') {
        return workerResult;
      }
      console.warn(
        `[analysis-orchestrator] worker failed for ${manifest.id}, falling back to oneshot: ${
          workerResult.error_message ?? 'unknown'
        }`,
      );
    }

    const allAnalyzed: string[] = [];
    let schemaVersion = '1';
    let generatedAt = new Date().toISOString();

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
      const chunk = chunks[chunkIndex]!;
      const chunkResult = await this.spawnParserChunk(
        manifest,
        projectId,
        workingCopyRoot,
        analysisRunId,
        chunk,
      );
      if (chunkResult.status !== 'success' || !chunkResult.payload) {
        return {
          parser_id: manifest.id,
          status: 'failed',
          error_message:
            chunkResult.error_message ??
            `Parser chunk ${chunkIndex + 1}/${chunks.length} failed`,
        };
      }

      const payload = chunkResult.payload;
      schemaVersion = payload.schema_version;
      generatedAt = payload.generated_at;
      allAnalyzed.push(...payload.files_analyzed);

      try {
        await this.ingestService?.ingestNative(payload);
      } catch (error) {
        return {
          parser_id: manifest.id,
          status: 'failed',
          error_message:
            error instanceof Error
              ? error.message
              : `Ingest failed for chunk ${chunkIndex + 1}/${chunks.length}`,
        };
      }
    }

    await this.parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: analysisRunId,
      parser_id: manifest.id,
      schema_version: schemaVersion,
      generated_at: generatedAt,
      files_analyzed: allAnalyzed,
      chunk_count: chunks.length,
    });

    return {
      parser_id: manifest.id,
      status: 'success',
      error_message: null,
    };
  }

  private async spawnParserWithWorker(
    manifest: NonNullable<ReturnType<ParserRegistryService['getManifest']>>,
    projectId: string,
    workingCopyRoot: string,
    analysisRunId: string,
    chunks: string[][],
  ): Promise<ParserResultSummary> {
    const parserDir = join(this.config.PARSERS_ROOT, manifest.id);
    const command = manifest.command.map((part) =>
      part === 'run.mjs' || part === 'run.sh' ? join(parserDir, part) : part,
    );
    const timeoutMs = manifest.timeout_ms ?? this.config.ANALYSIS_PARSER_TIMEOUT_MS;
    const workerArgs = [
      ...command.slice(1),
      '--ods-worker',
      '--project-id',
      projectId,
      '--working-copy-root',
      workingCopyRoot,
      '--analysis-run-id',
      analysisRunId,
    ];

    let session: ParserWorkerSession | null = null;
    const allAnalyzed: string[] = [];
    let schemaVersion = '1';
    let generatedAt = new Date().toISOString();

    try {
      session = await ParserWorkerSession.start({
        command: command[0]!,
        args: workerArgs,
        cwd: parserDir,
        timeoutMs,
      });

      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        const chunk = chunks[chunkIndex]!;
        const tempDir = await mkdtemp(join(tmpdir(), 'ods-parser-w-'));
        const outputPath = join(tempDir, 'envelope.json');
        const fileListPath = join(tempDir, 'files.txt');
        try {
          await writeFile(fileListPath, chunk.join('\n'), 'utf8');
          await session.runChunk(chunkIndex, fileListPath, outputPath);
          const raw = await readFile(outputPath, 'utf8');
          const parsed = envelopeSchema.parse(JSON.parse(raw));
          if (parsed.parser_id !== manifest.id || parsed.analysis_run_id !== analysisRunId) {
            return {
              parser_id: manifest.id,
              status: 'failed',
              error_message: 'Envelope does not match the analysis run or parser',
            };
          }
          schemaVersion = parsed.schema_version;
          generatedAt = parsed.generated_at;
          allAnalyzed.push(...parsed.files_analyzed);
          await this.ingestService?.ingestNative(parsed);
        } catch (error) {
          return {
            parser_id: manifest.id,
            status: 'failed',
            error_message:
              error instanceof Error
                ? error.message
                : `Worker chunk ${chunkIndex + 1}/${chunks.length} failed`,
          };
        } finally {
          await rm(tempDir, { recursive: true, force: true });
        }
      }
    } catch (error) {
      return {
        parser_id: manifest.id,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Failed to start parser worker',
      };
    } finally {
      if (session) {
        await session.shutdown();
      }
    }

    await this.parserEnvelopeRepository.save({
      project_id: projectId,
      analysis_run_id: analysisRunId,
      parser_id: manifest.id,
      schema_version: schemaVersion,
      generated_at: generatedAt,
      files_analyzed: allAnalyzed,
      chunk_count: chunks.length,
    });

    return {
      parser_id: manifest.id,
      status: 'success',
      error_message: null,
    };
  }

  private async spawnParserChunk(
    manifest: NonNullable<ReturnType<ParserRegistryService['getManifest']>>,
    projectId: string,
    workingCopyRoot: string,
    analysisRunId: string,
    files: string[],
  ): Promise<{
    status: 'success' | 'failed';
    error_message: string | null;
    payload?: ParserEnvelopePayload;
  }> {
    const tempDir = await mkdtemp(join(tmpdir(), 'ods-parser-'));
    const outputPath = join(tempDir, 'envelope.json');
    const fileListPath = join(tempDir, 'files.txt');
    const parserDir = join(this.config.PARSERS_ROOT, manifest.id);
    const command = manifest.command.map((part) =>
      part === 'run.mjs' || part === 'run.sh' ? join(parserDir, part) : part,
    );

    await writeFile(fileListPath, files.join('\n'), 'utf8');

    const args = [
      ...command.slice(1),
      '--project-id',
      projectId,
      '--working-copy-root',
      workingCopyRoot,
      '--analysis-run-id',
      analysisRunId,
      '--file-list',
      fileListPath,
      '--output',
      outputPath,
    ];

    const timeoutMs = manifest.timeout_ms ?? this.config.ANALYSIS_PARSER_TIMEOUT_MS;

    try {
      const { exitCode, stderr } = await this.runProcess(command[0], args, timeoutMs, parserDir);
      if (exitCode !== 0) {
        return {
          status: 'failed',
          error_message: stderr || `Parser exited with code ${exitCode}`,
        };
      }

      const raw = await readFile(outputPath, 'utf8');
      const parsed = envelopeSchema.parse(JSON.parse(raw));

      if (parsed.parser_id !== manifest.id || parsed.analysis_run_id !== analysisRunId) {
        return {
          status: 'failed',
          error_message: 'Envelope does not match the analysis run or parser',
        };
      }

      return {
        status: 'success',
        error_message: null,
        payload: parsed,
      };
    } catch (error) {
      return {
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Failed to start parser',
      };
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  private runProcess(
    command: string,
    args: string[],
    timeoutMs: number,
    cwd: string,
  ): Promise<{ exitCode: number; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
      let stderr = '';

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        child.kill('SIGKILL');
      }, timeoutMs);

      child.on('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({ exitCode: code ?? 1, stderr: stderr.trim() });
      });
    });
  }
}
