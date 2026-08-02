import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { AppConfig } from '../config.js';
import type { AiJobDocument } from '../domain/ai-job.js';
import type { DocsService } from './docs.service.js';

export class AgentPromptService {
  constructor(
    private readonly config: AppConfig,
    private readonly docsService: DocsService,
  ) {}

  async seed(projectId: string, baseUrl?: string): Promise<void> {
    await this.docsService.migrateLegacyAgentIfNeeded(projectId);
    await this.docsService.writeAgent(projectId, await this.render({
      projectId,
      analysisRunId: '',
      language: 'en',
      writeMode: 'overwrite',
      generationId: null,
      jobId: '',
      baseUrl: baseUrl ?? this.defaultBaseUrl(),
    }));
  }

  /** Seed AGENT-DOC.md if missing (existing projects imported before 015/027). */
  async ensureSeeded(projectId: string, baseUrl?: string): Promise<void> {
    await this.docsService.migrateLegacyAgentIfNeeded(projectId);
    if (await this.docsService.hasAgent(projectId)) return;
    await this.seed(projectId, baseUrl);
  }

  async renderForJob(job: AiJobDocument, baseUrl?: string): Promise<string> {
    return this.render({
      projectId: job.project_id,
      analysisRunId: job.analysis_run_id,
      language: job.docs_language,
      writeMode: job.docs_write_mode,
      generationId: job.docs_generation_id,
      jobId: job.id,
      baseUrl: baseUrl ?? this.defaultBaseUrl(),
    });
  }

  async renderCodeForJob(job: AiJobDocument, baseUrl?: string): Promise<string> {
    const template = await this.readCodeTemplate();
    return this.replacePlaceholders(template, {
      ODS_BASE_URL: baseUrl ?? this.defaultBaseUrl(),
      PROJECT_ID: job.project_id,
      ANALYSIS_RUN_ID: job.analysis_run_id,
      CODE_JOB_ID: job.id,
    });
  }

  async writeCodeAgent(projectId: string, content: string): Promise<void> {
    await this.docsService.writeCodeAgent(projectId, content);
  }

  /**
   * After first successful parser analysis: seed AGENT-CODE.md if missing
   * (placeholders without CODE_JOB_ID until code-download).
   */
  async ensureCodeSeeded(
    projectId: string,
    analysisRunId: string,
    baseUrl?: string,
  ): Promise<void> {
    if (await this.docsService.hasCodeAgent(projectId)) return;
    await this.seedCodeAgent(projectId, analysisRunId, baseUrl);
  }

  async seedCodeAgent(
    projectId: string,
    analysisRunId: string,
    baseUrl?: string,
  ): Promise<void> {
    const template = await this.readCodeTemplate();
    const content = this.replacePlaceholders(template, {
      ODS_BASE_URL: baseUrl ?? this.defaultBaseUrl(),
      PROJECT_ID: projectId,
      ANALYSIS_RUN_ID: analysisRunId,
      CODE_JOB_ID: '',
    });
    await this.writeCodeAgent(projectId, content);
  }

  private async render(values: Record<string, string | null>): Promise<string> {
    const template = await this.readTemplate();
    return this.replacePlaceholders(template, {
      ODS_BASE_URL: values.baseUrl ?? this.defaultBaseUrl(),
      PROJECT_ID: values.projectId ?? '',
      ANALYSIS_RUN_ID: values.analysisRunId ?? '',
      DOCS_JOB_ID: values.jobId ?? '',
      DOCS_LANGUAGE: values.language ?? 'en',
      DOCS_WRITE_MODE: values.writeMode ?? 'overwrite',
      DOCS_GENERATION_ID: values.generationId ?? '',
    });
  }

  private replacePlaceholders(template: string, values: Record<string, string>): string {
    return Object.entries(values).reduce(
      (rendered, [key, value]) =>
        rendered
          .replaceAll(`<${key}>`, value)
          .replace(new RegExp(`^(${key})=<[^\\n>]*>$`, 'gm'), `$1=${value}`),
      template,
    );
  }

  private defaultBaseUrl(): string {
    return this.config.PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  }

  private async readTemplate(): Promise<string> {
    return this.readTemplateFromCandidates(this.config.DOCS_PROMPT_TEMPLATE, 'docs-agent-prompt.md', 'Docs');
  }

  private async readCodeTemplate(): Promise<string> {
    return this.readTemplateFromCandidates(this.config.CODE_PROMPT_TEMPLATE, 'code-agent-prompt.md', 'Code');
  }

  private async readTemplateFromCandidates(
    configured: string,
    filename: string,
    label: string,
  ): Promise<string> {
    const candidates = [
      resolve(configured),
      resolve(process.cwd(), configured),
      resolve(this.config.PARSERS_ROOT, '..', 'prompts', filename),
      resolve(process.cwd(), 'prompts', filename),
    ];
    const errors: string[] = [];
    for (const candidate of candidates) {
      try {
        return await readFile(candidate, 'utf8');
      } catch (error: unknown) {
        if (!isMissing(error)) throw error;
        errors.push(candidate);
      }
    }
    throw new Error(`${label} prompt template not found. Tried: ${errors.join(', ')}`);
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
