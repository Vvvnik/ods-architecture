import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
import type { LanguageEntry } from '../domain/language-report.js';
import type { ParserEnvelopePayload } from '../domain/parser-envelope.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { LanguageReportRepository } from '../repositories/language-report.repository.js';
import type { ParserEnvelopeRepository } from '../repositories/parser-envelope.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { ChangeSetService } from './change-set.service.js';
import { listAllFilePaths } from './language-detector.service.js';
import type { IngestService } from './ingest/ingest.service.js';
import type { ParserRegistryService } from './parser-registry.service.js';
import type { SyncService } from './sync.service.js';

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
  ) {}

  isRunning(projectId: string): boolean {
    return this.locks.has(projectId);
  }

  async startRun(
    projectId: string,
    languageReportId: string,
    confirmedChangeSet: boolean,
  ): Promise<AnalysisRunDocument> {
    if (!confirmedChangeSet) {
      throw new AppError('validation_error', 'confirmed_change_set обязателен', 400);
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

    const changeSet = await this.changeSetService.buildChangeSet(
      projectId,
      project.working_copy_root,
    );

    const run = await this.analysisRunRepository.create({
      project_id: projectId,
      language_report_id: languageReportId,
      status: 'pending',
      started_at: new Date().toISOString(),
      completed_at: null,
      incremental: changeSet.incremental,
      change_set: changeSet,
      parser_results: [],
      last_error_message: null,
    });

    this.locks.add(projectId);
    void this.executeRun(project, report.languages, run, changeSet);

    return run;
  }

  private async executeRun(
    project: NonNullable<Awaited<ReturnType<ProjectRepository['getById']>>>,
    languages: LanguageEntry[],
    run: AnalysisRunDocument,
    changeSet: ChangeSet,
  ): Promise<void> {
    try {
      await this.analysisRunRepository.update(run.id, { status: 'running' });
      await this.parserRegistry.ensureLoaded();

      const parserResults: ParserResultSummary[] = [];
      const spawnOrder = [...languages].sort((a, b) => {
        if (b.file_count !== a.file_count) {
          return b.file_count - a.file_count;
        }
        return a.language.localeCompare(b.language);
      });

      const spawnedParserIds = new Set<string>();

      for (const entry of spawnOrder) {
        if (!entry.parser_id || entry.parser_status === 'missing') {
          if (entry.parser_id) {
            parserResults.push({
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
          parserResults.push({
            parser_id: entry.parser_id,
            status: 'missing',
            error_message: 'Манифест парсера не найден',
          });
          continue;
        }

        const parserChangeSet = this.changeSetService.resolveParserChangeSet(changeSet, entry.language);
        const files = await this.resolveFilesForParser(
          project.working_copy_root,
          entry,
          changeSet,
        );

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

          parserResults.push({
            parser_id: entry.parser_id,
            status: 'skipped',
            error_message: null,
          });
          continue;
        }

        if (changeSet.incremental && parserChangeSet.deleted.length > 0) {
          this.logDeletedPaths(entry.parser_id, parserChangeSet.deleted);
        }

        const result = await this.spawnParser(
          manifest,
          project.id,
          project.working_copy_root,
          run.id,
          files,
        );
        parserResults.push(result);
      }

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
      });

      if (status === 'success' || status === 'partial') {
        await this.changeSetService.captureSnapshot(project.id, project.working_copy_root);
        await this.ingestService?.completeRun(run.id);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка анализа';
      await this.analysisRunRepository.update(run.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        last_error_message: message,
      });
    } finally {
      this.locks.delete(project.id);
    }
  }

  private async resolveFilesForParser(
    workingCopyRoot: string,
    entry: LanguageEntry,
    changeSet: ChangeSet,
  ): Promise<string[]> {
    if (!changeSet.incremental) {
      const allPaths = await listAllFilePaths(workingCopyRoot, this.config.ANALYSIS_DETECTOR_DENYLIST);
      return this.changeSetService.pathsForLanguage(allPaths, entry.language);
    }

    return this.changeSetService.resolveParserChangeSet(changeSet, entry.language).spawn;
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
    const tempDir = await mkdtemp(join(tmpdir(), 'ods-parser-'));
    const outputPath = join(tempDir, 'envelope.json');
    const parserDir = join(this.config.PARSERS_ROOT, manifest.id);
    const command = manifest.command.map((part) =>
      part === 'run.mjs' || part === 'run.sh' ? join(parserDir, part) : part,
    );

    const args = [
      ...command.slice(1),
      '--project-id',
      projectId,
      '--working-copy-root',
      workingCopyRoot,
      '--analysis-run-id',
      analysisRunId,
      '--files',
      JSON.stringify(files),
      '--output',
      outputPath,
    ];

    const timeoutMs = manifest.timeout_ms ?? this.config.ANALYSIS_PARSER_TIMEOUT_MS;

    try {
      const { exitCode, stderr } = await this.runProcess(command[0], args, timeoutMs, parserDir);
      if (exitCode !== 0) {
        return {
          parser_id: manifest.id,
          status: 'failed',
          error_message: stderr || `Парсер завершился с кодом ${exitCode}`,
        };
      }

      const raw = await readFile(outputPath, 'utf8');
      const parsed = envelopeSchema.parse(JSON.parse(raw));

      if (parsed.parser_id !== manifest.id || parsed.analysis_run_id !== analysisRunId) {
        return {
          parser_id: manifest.id,
          status: 'failed',
          error_message: 'Envelope не соответствует прогону или парсеру',
        };
      }

      const payload: ParserEnvelopePayload = parsed;
      const saved = await this.parserEnvelopeRepository.save({
        project_id: projectId,
        analysis_run_id: analysisRunId,
        parser_id: payload.parser_id,
        schema_version: payload.schema_version,
        generated_at: payload.generated_at,
        files_analyzed: payload.files_analyzed,
        model: payload.model,
      });

      await this.ingestService?.ingestEnvelope(saved.id);

      return {
        parser_id: manifest.id,
        status: 'success',
        error_message: null,
      };
    } catch (error) {
      return {
        parser_id: manifest.id,
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Ошибка запуска парсера',
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
