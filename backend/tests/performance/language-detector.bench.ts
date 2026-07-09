import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { LanguageDetectorService } from '../../src/services/language-detector.service.js';
import type { ParserRegistryService } from '../../src/services/parser-registry.service.js';
import { createManyFiles, createTempGitRepo } from '../helpers/test-utils.js';

const execFileAsync = promisify(execFile);

const config = {
  PORT: 3000,
  ELASTICSEARCH_URL: 'http://localhost:9200',
  DATA_ROOT: '/tmp/ods-data',
  LOCAL_REPOS_MOUNT: '/repos',
  GIT_CLONE_DEPTH: 1,
  PARSERS_ROOT: './parsers',
  ANALYSIS_PARSER_TIMEOUT_MS: 600_000,
  ANALYSIS_MAX_PARALLEL_PARSERS: 2,
  ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
};

const parserRegistry = {
  ensureLoaded: async () => {},
  resolveParserId: (language: string) =>
    ['typescript', 'javascript', 'python', 'csharp', 'cpp'].includes(language) ? language : null,
} as unknown as ParserRegistryService;

const analysisRunRepository = {
  listByProjectId: async () => [],
};

describe('language detector performance (SC-001)', () => {
  let repoRoot = '';

  beforeAll(async () => {
    repoRoot = await createTempGitRepo();
    await createManyFiles(repoRoot, 'bench', 10_000, 'file', 'ts');
    await execFileAsync('git', ['add', '.'], { cwd: repoRoot });
    await execFileAsync('git', ['commit', '-m', 'bench-10k'], { cwd: repoRoot });
  }, 120_000);

  afterAll(async () => {
    if (!repoRoot) {
      return;
    }
    try {
      await execFileAsync('rm', ['-rf', repoRoot]);
    } catch {
      // best-effort cleanup of large temp git repo
    }
  });

  it('detects languages for 10k files in under 30 seconds', async () => {
    const detector = new LanguageDetectorService(
      config,
      parserRegistry,
      analysisRunRepository as never,
    );

    const started = Date.now();
    const languages = await detector.detectLanguages(repoRoot);
    const elapsed = Date.now() - started;

    expect(languages.length).toBeGreaterThan(0);
    expect(languages[0]?.file_count).toBe(10_000);
    expect(elapsed).toBeLessThan(30_000);
  }, 60_000);
});
