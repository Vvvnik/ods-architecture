import { randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';

import { AppError } from '../domain/errors.js';
import { toProjectPublic } from '../domain/project.js';
import type { ElementRepository } from '../repositories/element.repository.js';
import type { GraphEdgeRepository } from '../repositories/graph-edge.repository.js';
import type { GraphNodeRepository } from '../repositories/graph-node.repository.js';
import type { LanguageReportRepository } from '../repositories/language-report.repository.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import type { ParserEnvelopeRepository } from '../repositories/parser-envelope.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { SyncSnapshotRepository } from '../repositories/sync-snapshot.repository.js';
import type { SyncService } from './sync.service.js';
import type { WorkspaceService } from './workspace.service.js';
import type { AnalysisOrchestratorService } from './analysis-orchestrator.service.js';
import type { AgentPromptService } from './agent-prompt.service.js';
import type { DocsService } from './docs.service.js';

export interface RegisterProjectInput {
  source_type: 'git_url' | 'local_path';
  source_value: string;
  name?: string;
}

export class ProjectService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly elementRepository: ElementRepository,
    private readonly graphNodeRepository: GraphNodeRepository,
    private readonly graphEdgeRepository: GraphEdgeRepository,
    private readonly languageReportRepository: LanguageReportRepository,
    private readonly analysisRunRepository: AnalysisRunRepository,
    private readonly parserEnvelopeRepository: ParserEnvelopeRepository,
    private readonly syncSnapshotRepository: SyncSnapshotRepository,
    private readonly workspaceService: WorkspaceService,
    private readonly syncService: SyncService,
    private readonly docsService: DocsService,
    private readonly agentPromptService: AgentPromptService,
    private readonly orchestrator?: AnalysisOrchestratorService,
  ) {}

  async listProjects() {
    const projects = await this.projectRepository.list();
    return projects.map(toProjectPublic);
  }

  async getProject(projectId: string) {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }
    return toProjectPublic(project);
  }

  async triggerSync(projectId: string) {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    this.syncService.beginScheduledSync(projectId, project.sync_status);

    await this.projectRepository.update(projectId, {
      sync_status: 'running',
      last_error_message: null,
      sync_phase: 'refresh_wc',
      sync_files_done: 0,
      sync_files_total: null,
      sync_progress_updated_at: new Date().toISOString(),
    });

    this.syncService.scheduleSync(projectId);

    const refreshed = await this.projectRepository.getById(projectId);
    return toProjectPublic(refreshed ?? project);
  }

  async register(input: RegisterProjectInput) {
    const existing = await this.projectRepository.findBySource(
      input.source_type,
      input.source_value,
    );

    if (existing) {
      return { project: toProjectPublic(existing), created: false as const };
    }

    const id = randomUUID();
    const workingCopyRoot = this.workspaceService.resolveWorkingCopyRoot(
      id,
      input.source_type,
      input.source_value,
    );

    const project = await this.projectRepository.create({
      id,
      name: input.name?.trim() || deriveProjectName(input.source_type, input.source_value),
      source_type: input.source_type,
      source_value: input.source_value,
      working_copy_root: workingCopyRoot,
      created_at: new Date().toISOString(),
      last_sync_at: null,
      sync_status: 'idle',
      last_error_message: null,
    });

    try {
      await this.workspaceService.prepareProject(project);
      await this.agentPromptService.seed(project.id);
    } catch (error) {
      await this.workspaceService.removeWorkingCopy(project);
      await this.docsService.removeProject(project.id);
      await this.projectRepository.deleteById(project.id);
      throw error;
    }

    await this.projectRepository.update(project.id, {
      sync_status: 'running',
      last_error_message: null,
      sync_phase: 'refresh_wc',
      sync_files_done: 0,
      sync_files_total: null,
      sync_progress_updated_at: new Date().toISOString(),
    });

    this.syncService.scheduleSync(project.id);

    const refreshed = await this.projectRepository.getById(project.id);
    return {
      project: toProjectPublic(refreshed ?? project),
      created: true as const,
    };
  }

  async deleteProject(projectId: string): Promise<void> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    if (project.sync_status === 'running' || this.syncService.isRunning(projectId)) {
      throw new AppError('sync_in_progress', undefined, 409);
    }

    if (this.orchestrator?.isRunning(projectId)) {
      throw new AppError('analysis_in_progress', undefined, 409);
    }

    const runningAnalysis = await this.analysisRunRepository.findRunningByProjectId(projectId);
    if (runningAnalysis) {
      throw new AppError('analysis_in_progress', undefined, 409);
    }

    this.syncService.releaseSyncLock(projectId);
    await this.elementRepository.deleteByProjectId(projectId);
    await this.graphNodeRepository.deleteByProjectId(projectId);
    await this.graphEdgeRepository.deleteByProjectId(projectId);
    await this.languageReportRepository.deleteByProjectId(projectId);
    await this.analysisRunRepository.deleteByProjectId(projectId);
    await this.parserEnvelopeRepository.deleteByProjectId(projectId);
    await this.syncSnapshotRepository.deleteByProjectId(projectId);
    await this.docsService.removeProject(projectId);
    await this.workspaceService.removeWorkingCopy(project);
    await this.projectRepository.deleteById(projectId);
  }
}

function deriveProjectName(
  sourceType: RegisterProjectInput['source_type'],
  sourceValue: string,
): string {
  if (sourceType === 'git_url') {
    const withoutGit = sourceValue.replace(/\.git$/i, '');
    const parts = withoutGit.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'project';
  }

  return basename(resolve(sourceValue)) || 'project';
}
