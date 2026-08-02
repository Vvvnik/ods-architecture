import { access, mkdir, readdir, readFile, rename, rm, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

import type { AppConfig } from '../config.js';
import type { DocsWriteMode } from '../domain/ai-job.js';
import { AppError } from '../domain/errors.js';

/** Canonical docs-agent prompt file (027; formerly AGENT.md). */
export const AGENT_DOC_FILE = 'AGENT-DOC.md';
/** Code-agent prompt file (027); created on code-download only. */
export const AGENT_CODE_FILE = 'AGENT-CODE.md';
/** Pre-027 docs prompt filename; migrated to AGENT-DOC.md on access. */
export const AGENT_MD_LEGACY = 'AGENT.md';

const RESERVED_AGENT_FILES = new Set([AGENT_DOC_FILE, AGENT_CODE_FILE, AGENT_MD_LEGACY]);

export interface DocsTreeEntry {
  path: string;
  type: 'file' | 'dir';
}

export class DocsService {
  constructor(private readonly config: AppConfig) {}

  root(projectId: string): string {
    if (!projectId || projectId.includes('/') || projectId.includes('\\') || projectId.includes('..')) {
      throw new AppError('docs_path_invalid', undefined, 400);
    }
    return resolve(this.config.DATA_ROOT, 'docs', projectId);
  }

  async ensureRoot(projectId: string): Promise<void> {
    await mkdir(this.root(projectId), { recursive: true });
  }

  /**
   * If legacy AGENT.md exists and AGENT-DOC.md does not, rename in place.
   * Idempotent; safe to call on every docs list/read/download.
   */
  async migrateLegacyAgentIfNeeded(projectId: string): Promise<boolean> {
    await this.ensureRoot(projectId);
    const root = this.root(projectId);
    const docPath = resolve(root, AGENT_DOC_FILE);
    const legacyPath = resolve(root, AGENT_MD_LEGACY);

    if (await pathExists(docPath)) {
      return false;
    }
    if (!(await pathExists(legacyPath))) {
      return false;
    }

    await rename(legacyPath, docPath);
    return true;
  }

  async listTree(projectId: string): Promise<DocsTreeEntry[]> {
    const root = this.root(projectId);
    const entries: DocsTreeEntry[] = [];
    await this.walk(root, root, entries);
    return entries.sort((a, b) => a.path.localeCompare(b.path));
  }

  async read(projectId: string, path: string): Promise<string> {
    const filePath = this.resolvePath(projectId, path);
    try {
      return await readFile(filePath, 'utf8');
    } catch (error: unknown) {
      if (isMissing(error)) throw new AppError('not_found', undefined, 404);
      throw error;
    }
  }

  async write(
    projectId: string,
    path: string,
    content: string,
    options: { mode: DocsWriteMode; generationId: string | null; allowAgentFile?: boolean },
  ): Promise<void> {
    this.assertWritablePath(path, options);
    const filePath = this.resolvePath(projectId, path);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, 'utf8');
  }

  async delete(
    projectId: string,
    path: string,
    options: { mode: DocsWriteMode; generationId: string | null },
  ): Promise<void> {
    this.assertWritablePath(path, options);
    const filePath = this.resolvePath(projectId, path);
    try {
      await unlink(filePath);
    } catch (error: unknown) {
      if (isMissing(error)) throw new AppError('not_found', undefined, 404);
      throw error;
    }
  }

  async writeAgent(projectId: string, content: string): Promise<void> {
    await this.write(projectId, AGENT_DOC_FILE, content, {
      mode: 'overwrite',
      generationId: null,
      allowAgentFile: true,
    });
  }

  async writeCodeAgent(projectId: string, content: string): Promise<void> {
    await this.write(projectId, AGENT_CODE_FILE, content, {
      mode: 'overwrite',
      generationId: null,
      allowAgentFile: true,
    });
  }

  /** True if AGENT-DOC.md exists under the project docs root. */
  async hasAgent(projectId: string): Promise<boolean> {
    try {
      await this.read(projectId, AGENT_DOC_FILE);
      return true;
    } catch (error: unknown) {
      if (error instanceof AppError && error.statusCode === 404) return false;
      if (isMissing(error)) return false;
      throw error;
    }
  }

  /** True if AGENT-CODE.md exists under the project docs root. */
  async hasCodeAgent(projectId: string): Promise<boolean> {
    try {
      await this.read(projectId, AGENT_CODE_FILE);
      return true;
    } catch (error: unknown) {
      if (error instanceof AppError && error.statusCode === 404) return false;
      if (isMissing(error)) return false;
      throw error;
    }
  }

  async removeProject(projectId: string): Promise<void> {
    await rm(this.root(projectId), { recursive: true, force: true });
  }

  private resolvePath(projectId: string, requestedPath: string): string {
    if (!requestedPath || requestedPath.includes('\0') || requestedPath.startsWith('/') || requestedPath.startsWith('\\')) {
      throw new AppError('docs_path_invalid', undefined, 400);
    }
    const root = this.root(projectId);
    const target = resolve(root, requestedPath);
    const rel = relative(root, target);
    if (!rel || rel === '..' || rel.startsWith(`..${sep}`) || rel.includes(`..${sep}`)) {
      throw new AppError('docs_path_invalid', undefined, 400);
    }
    return target;
  }

  private assertWritablePath(
    requestedPath: string,
    options: { mode: DocsWriteMode; generationId: string | null; allowAgentFile?: boolean },
  ): void {
    const normalized = requestedPath.replaceAll('\\', '/').replace(/^\.\/+/, '');
    if (!options.allowAgentFile && RESERVED_AGENT_FILES.has(normalized)) {
      throw new AppError('docs_agent_file_reserved', undefined, 403);
    }

    const generationPrefix = '_generations/';
    if (options.mode === 'versioned') {
      if (!options.generationId) {
        throw new AppError('validation_error', 'generation_id is required for versioned docs', 400);
      }
      if (!normalized.startsWith(`${generationPrefix}${options.generationId}/`)) {
        throw new AppError('docs_path_invalid', 'Versioned docs must be written to the current generation', 400);
      }
      return;
    }

    if (normalized.startsWith(generationPrefix)) {
      throw new AppError('docs_path_invalid', 'Overwrite docs cannot be written under _generations', 400);
    }
  }

  private async walk(root: string, directory: string, output: DocsTreeEntry[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error: unknown) {
      if (isMissing(error)) return;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = resolve(directory, entry.name);
      const path = relative(root, fullPath).replaceAll('\\', '/');
      if (entry.isDirectory()) {
        output.push({ path, type: 'dir' });
        await this.walk(root, fullPath, output);
      } else if (entry.isFile()) {
        output.push({ path, type: 'file' });
      }
    }
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
