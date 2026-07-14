import type { LanguageReportDocument } from '../domain/language-report.js';
import { AppError } from '../domain/errors.js';
import type { ChangeSet } from '../domain/analysis-run.js';
import type { LanguageReportRepository } from '../repositories/language-report.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { AnalysisOrchestratorService } from './analysis-orchestrator.service.js';
import type { ChangeSetService } from './change-set.service.js';
import type { LanguageDetectorService } from './language-detector.service.js';

export class AnalysisService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly languageReportRepository: LanguageReportRepository,
    private readonly languageDetector: LanguageDetectorService,
    private readonly changeSetService: ChangeSetService,
    private readonly orchestrator: AnalysisOrchestratorService,
  ) {}

  async runPostSyncDetection(projectId: string, syncId: string | null): Promise<void> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      return;
    }

    const detected = await this.languageDetector.detectLanguages(project.working_copy_root);
    const languages = await this.languageDetector.enrichWithParserStatus(projectId, detected);
    const rawArtifacts = await this.languageDetector.detectArtifactsForWorkingCopy(
      project.working_copy_root,
    );
    const artifacts = await this.languageDetector.enrichArtifactsWithParserStatus(
      projectId,
      rawArtifacts,
    );

    await this.languageReportRepository.save({
      project_id: projectId,
      detected_at: new Date().toISOString(),
      sync_id: syncId,
      languages,
      artifacts,
    });
  }

  async getLatestLanguageReport(projectId: string): Promise<LanguageReportDocument | null> {
    return this.languageReportRepository.getLatestByProjectId(projectId);
  }

  async getChangeSet(projectId: string): Promise<ChangeSet> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      throw new AppError('not_found', undefined, 404);
    }

    return this.changeSetService.buildChangeSet(projectId, project.working_copy_root);
  }

  isAnalysisRunning(projectId: string): boolean {
    return this.orchestrator.isRunning(projectId);
  }

  startRun(
    projectId: string,
    languageReportId: string,
    confirmedChangeSet: boolean,
  ): ReturnType<AnalysisOrchestratorService['startRun']> {
    return this.orchestrator.startRun(projectId, languageReportId, confirmedChangeSet);
  }
}
