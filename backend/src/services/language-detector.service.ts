import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, posix } from 'node:path';
import { createInterface } from 'node:readline';

import type { AppConfig } from '../config.js';
import type { ArtifactEntry, LanguageEntry } from '../domain/language-report.js';
import type { AnalysisRunRepository } from '../repositories/analysis-run.repository.js';
import { detectArtifacts } from './artifact-detector.js';
import type { ParserRegistryService } from './parser-registry.service.js';

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.pyw': 'python',
  '.cs': 'csharp',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  '.go': 'go',
  '.java': 'java',
  '.rb': 'ruby',
  '.rs': 'rust',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.scala': 'scala',
  '.sh': 'shell',
  '.bash': 'shell',
  '.zsh': 'shell',
};

const SHEBANG_LANGUAGE_MAP: Record<string, string> = {
  python: 'python',
  python3: 'python',
  node: 'javascript',
  bash: 'shell',
  sh: 'shell',
  zsh: 'shell',
};

const MAX_SAMPLE_PATHS = 5;
const MAX_SHEBANG_BYTES = 256;

export class LanguageDetectorService {
  constructor(
    private readonly config: AppConfig,
    private readonly parserRegistry: ParserRegistryService,
    private readonly analysisRunRepository: AnalysisRunRepository,
  ) {}

  async detectLanguages(
    workingCopyRoot: string,
    inventoryPaths?: string[],
  ): Promise<LanguageEntry[]> {
    const counts = new Map<string, { count: number; samples: string[] }>();

    if (inventoryPaths) {
      for (const relPath of inventoryPaths) {
        const absPath = join(workingCopyRoot, relPath);
        try {
          const language = await this.detectFileLanguage(absPath, relPath);
          if (!language) {
            continue;
          }
          const bucket = counts.get(language) ?? { count: 0, samples: [] };
          bucket.count += 1;
          if (bucket.samples.length < MAX_SAMPLE_PATHS) {
            bucket.samples.push(relPath);
          }
          counts.set(language, bucket);
        } catch {
          // skip
        }
      }
    } else {
      const denylist = new Set(this.config.ANALYSIS_DETECTOR_DENYLIST);
      await this.walkDirectory(workingCopyRoot, '', denylist, counts);
    }

    const entries: LanguageEntry[] = [];
    for (const [language, data] of counts) {
      entries.push({
        language,
        file_count: data.count,
        sample_paths: data.samples,
        parser_id: null,
        parser_status: 'missing',
      });
    }

    entries.sort((a, b) => {
      if (b.file_count !== a.file_count) {
        return b.file_count - a.file_count;
      }
      return a.language.localeCompare(b.language);
    });

    return entries;
  }

  async enrichWithParserStatus(
    projectId: string,
    languages: LanguageEntry[],
  ): Promise<LanguageEntry[]> {
    await this.parserRegistry.ensureLoaded();

    const failedParserIds = await this.collectFailedParserIds(projectId);

    return languages.map((entry) => {
      const parserId = this.parserRegistry.resolveParserId(entry.language);
      if (!parserId) {
        return {
          ...entry,
          parser_id: null,
          parser_status: 'missing',
        };
      }

      const manifest = this.parserRegistry.getManifest(parserId);
      const parserStatus =
        !manifest || failedParserIds.has(parserId) ? (manifest ? 'failed' : 'missing') : 'available';
      return {
        ...entry,
        parser_id: parserId,
        parser_status: parserStatus,
      };
    });
  }

  async enrichArtifactsWithParserStatus(
    projectId: string,
    artifacts: ArtifactEntry[],
  ): Promise<ArtifactEntry[]> {
    await this.parserRegistry.ensureLoaded();
    const failedParserIds = await this.collectFailedParserIds(projectId);

    return artifacts.map((entry) => {
      const parserId = entry.parser_id;
      if (!parserId) {
        return { ...entry, parser_status: 'missing' };
      }

      const manifest = this.parserRegistry.getManifest(parserId);
      if (!manifest) {
        return { ...entry, parser_status: 'missing' };
      }

      return {
        ...entry,
        parser_status: failedParserIds.has(parserId) ? 'failed' : 'available',
      };
    });
  }

  async detectArtifactsForWorkingCopy(
    workingCopyRoot: string,
    inventoryPaths?: string[],
  ): Promise<ArtifactEntry[]> {
    const paths =
      inventoryPaths ??
      (await listAllFilePaths(workingCopyRoot, this.config.ANALYSIS_DETECTOR_DENYLIST));
    return detectArtifacts(workingCopyRoot, paths);
  }

  private async collectFailedParserIds(projectId: string): Promise<Set<string>> {
    const failed = new Set<string>();
    const runs = await this.analysisRunRepository.listByProjectId(projectId, 5);

    for (const run of runs) {
      for (const result of run.parser_results ?? []) {
        if (result.status === 'failed') {
          failed.add(result.parser_id);
        }
      }
    }

    return failed;
  }

  private async walkDirectory(
    absoluteDir: string,
    relativeDir: string,
    denylist: Set<string>,
    counts: Map<string, { count: number; samples: string[] }>,
  ): Promise<void> {
    let entries;
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === '.git' || denylist.has(entry.name)) {
        continue;
      }

      const relPath = relativeDir ? posix.join(relativeDir, entry.name) : entry.name;
      const absPath = join(absoluteDir, entry.name);

      try {
        if (entry.isDirectory()) {
          await this.walkDirectory(absPath, relPath, denylist, counts);
          continue;
        }

        if (!entry.isFile()) {
          continue;
        }

        const language = await this.detectFileLanguage(absPath, relPath);
        if (!language) {
          continue;
        }

        const bucket = counts.get(language) ?? { count: 0, samples: [] };
        bucket.count += 1;
        if (bucket.samples.length < MAX_SAMPLE_PATHS) {
          bucket.samples.push(relPath);
        }
        counts.set(language, bucket);
      } catch {
        // skip unreadable paths
      }
    }
  }

  private async detectFileLanguage(absPath: string, relPath: string): Promise<string | null> {
    const ext = posix.extname(relPath).toLowerCase();
    if (ext && EXTENSION_LANGUAGE_MAP[ext]) {
      return EXTENSION_LANGUAGE_MAP[ext];
    }

    const shebangLanguage = await this.detectShebangLanguage(absPath);
    if (shebangLanguage) {
      return shebangLanguage;
    }

    if (relPath.endsWith('package.json')) {
      return this.detectPackageJsonLanguage(absPath);
    }

    return null;
  }

  private async detectShebangLanguage(absPath: string): Promise<string | null> {
    try {
      const fileStat = await stat(absPath);
      if (!fileStat.isFile() || fileStat.size === 0) {
        return null;
      }

      const stream = createReadStream(absPath, { end: MAX_SHEBANG_BYTES });
      const rl = createInterface({ input: stream, crlfDelay: Infinity });
      const firstLine = await new Promise<string | null>((resolve) => {
        rl.once('line', (line) => resolve(line));
        rl.once('close', () => resolve(null));
      });
      rl.close();

      if (!firstLine?.startsWith('#!')) {
        return null;
      }

      const parts = firstLine.slice(2).trim().split(/\s+/);
      const interpreter = parts[parts.length - 1]?.split('/').pop()?.toLowerCase();
      if (!interpreter) {
        return null;
      }

      return SHEBANG_LANGUAGE_MAP[interpreter] ?? null;
    } catch {
      return null;
    }
  }

  private async detectPackageJsonLanguage(absPath: string): Promise<string | null> {
    try {
      const raw = await readFile(absPath, 'utf8');
      const parsed = JSON.parse(raw) as {
        devDependencies?: Record<string, string>;
        dependencies?: Record<string, string>;
      };
      const deps = { ...parsed.dependencies, ...parsed.devDependencies };
      if (deps.typescript) {
        return 'typescript';
      }
      return 'javascript';
    } catch {
      return null;
    }
  }
}

export function extensionLanguageMap(): Record<string, string> {
  return { ...EXTENSION_LANGUAGE_MAP };
}

export function pathsMatchingLanguage(paths: string[], language: string): string[] {
  const extensions = Object.entries(EXTENSION_LANGUAGE_MAP)
    .filter(([, lang]) => lang === language)
    .map(([ext]) => ext);

  return paths.filter((path) => {
    const ext = posix.extname(path).toLowerCase();
    if (extensions.includes(ext)) {
      return true;
    }
    if (language === 'javascript' && ['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      return true;
    }
    if (language === 'typescript' && ['.ts', '.tsx'].includes(ext)) {
      return true;
    }
    if (language === 'javascript' && path.endsWith('package.json')) {
      return true;
    }
    return false;
  });
}

export async function listAllFilePaths(
  workingCopyRoot: string,
  denylist: readonly string[],
): Promise<string[]> {
  const paths: string[] = [];
  const denySet = new Set(denylist);
  await walkAllFiles(workingCopyRoot, '', denySet, paths);
  paths.sort((a, b) => a.localeCompare(b));
  return paths;
}

async function walkAllFiles(
  absoluteDir: string,
  relativeDir: string,
  denylist: Set<string>,
  paths: string[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === '.git' || denylist.has(entry.name)) {
      continue;
    }

    const relPath = relativeDir ? posix.join(relativeDir, entry.name) : entry.name;
    const absPath = join(absoluteDir, entry.name);

    try {
      if (entry.isDirectory()) {
        await walkAllFiles(absPath, relPath, denylist, paths);
        continue;
      }

      if (entry.isFile()) {
        paths.push(relPath);
      }
    } catch {
      // skip unreadable paths
    }
  }
}
