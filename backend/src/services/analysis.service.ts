import type { LanguageReportDocument } from '../domain/language-report.js';
import { AppError } from '../domain/errors.js';
import type { ChangeSet } from '../domain/analysis-run.js';
import type { LanguageReportRepository } from '../repositories/language-report.repository.js';
import type { ProjectRepository } from '../repositories/project.repository.js';
import type { AnalysisOrchestratorService } from './analysis-orchestrator.service.js';
import type { ChangeSetService } from './change-set.service.js';
import type { FileInventoryService } from './file-inventory.service.js';
import type { LanguageDetectorService } from './language-detector.service.js';

export class AnalysisService {
  constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly languageReportRepository: LanguageReportRepository,
    private readonly languageDetector: LanguageDetectorService,
    private readonly changeSetService: ChangeSetService,
    private readonly orchestrator: AnalysisOrchestratorService,
    private readonly fileInventoryService: FileInventoryService,
  ) {}

  async runPostSyncDetection(projectId: string, syncId: string | null): Promise<void> {
    const project = await this.projectRepository.getById(projectId);
    if (!project) {
      return;
    }

    const inventory = this.fileInventoryService.getCached(projectId);
    const inventoryPaths = inventory?.files.map((f) => f.path);

    const detected = await this.languageDetector.detectLanguages(
      project.working_copy_root,
      inventoryPaths,
    );
    const languages = await this.languageDetector.enrichWithParserStatus(projectId, detected);
    const rawArtifacts = await this.languageDetector.detectArtifactsForWorkingCopy(
      project.working_copy_root,
      inventoryPaths,
    );
    const artifacts = await this.languageDetector.enrichArtifactsWithParserStatus(
      projectId,
      rawArtifacts,
    );
    const frontendLanguages = await this.languageDetector.detectFrontendLanguages(
      project.working_copy_root,
      inventoryPaths,
    );

    await this.languageReportRepository.save({
      project_id: projectId,
      detected_at: new Date().toISOString(),
      sync_id: syncId,
      languages,
      artifacts,
      frontend_languages: frontendLanguages.length > 0 ? frontendLanguages : undefined,
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

    const cached = this.fileInventoryService.getCached(projectId);
    return this.changeSetService.buildChangeSet(
      projectId,
      project.working_copy_root,
      cached?.files,
    );
  }

  isAnalysisRunning(projectId: string): boolean {
    return this.orchestrator.isRunning(projectId);
  }

  startRun(
    projectId: string,
    languageReportId: string,
    confirmedChangeSet: boolean,
    options?: { forceFull?: boolean },
  ): ReturnType<AnalysisOrchestratorService['startRun']> {
    return this.orchestrator.startRun(projectId, languageReportId, confirmedChangeSet, options);
  }
}
