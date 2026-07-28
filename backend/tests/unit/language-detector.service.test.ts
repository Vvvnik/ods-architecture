import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { extensionLanguageMap, LanguageDetectorService } from '../../src/services/language-detector.service.js';
import type { ParserRegistryService } from '../../src/services/parser-registry.service.js';
import { createTempGitRepo } from '../helpers/test-utils.js';

describe('LanguageDetectorService', () => {
  let repoRoot: string;

  const config = {
    PORT: 3000,
    ELASTICSEARCH_URL: 'http://localhost:9200',
    DATA_ROOT: '/tmp/ods-data',
    LOCAL_REPOS_MOUNT: '/repos',
    GIT_CLONE_DEPTH: 1,
    PARSERS_ROOT: './parsers',
    ANALYSIS_PARSER_TIMEOUT_MS: 600_000,
    ANALYSIS_MAX_PARALLEL_PARSERS: 2,
    ANALYSIS_PARSER_FILE_CHUNK_SIZE: 500,
    ANALYSIS_REQUIRE_PREBUILT: false,
    ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
  };

  const parserRegistry = {
    ensureLoaded: async () => {},
    resolveParserId: (language: string) => (language === 'typescript' ? 'typescript' : null),
    getManifest: (parserId: string) =>
      parserId === 'typescript' ? { id: 'typescript' } : null,
  } as unknown as ParserRegistryService;

  const analysisRunRepository = {
    listByProjectId: async () => [],
  };

  let detector: LanguageDetectorService;

  beforeEach(async () => {
    repoRoot = await createTempGitRepo({
      'src/app.ts': 'export const app = 1;',
      'src/main.ts': 'export const main = 2;',
      'src/util.py': 'print("hi")',
      'README.md': '# docs',
      'node_modules/pkg/index.js': 'module.exports = {}',
    });
    detector = new LanguageDetectorService(config, parserRegistry, analysisRunRepository as never);
  });

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(repoRoot, { recursive: true, force: true });
  });

  it('sorts languages by file_count desc then name asc', async () => {
    const languages = await detector.detectLanguages(repoRoot);
    expect(languages.map((entry) => entry.language)).toEqual(['typescript', 'python']);
    expect(languages[0].file_count).toBe(2);
  });

  it('maps extensions to languages', () => {
    expect(extensionLanguageMap()['.ts']).toBe('typescript');
    expect(extensionLanguageMap()['.py']).toBe('python');
  });

  it('marks missing parser when registry has no module', async () => {
    const detected = await detector.detectLanguages(repoRoot);
    const enriched = await detector.enrichWithParserStatus('project-1', detected);
    const python = enriched.find((entry) => entry.language === 'python');
    expect(python?.parser_status).toBe('missing');
    expect(python?.parser_id).toBeNull();
  });

  it('clears failed badge when latest run succeeded after an older failure', async () => {
    const csharpRegistry = {
      ensureLoaded: async () => {},
      resolveParserId: (language: string) => (language === 'csharp' ? 'csharp' : null),
      getManifest: (parserId: string) => (parserId === 'csharp' ? { id: 'csharp' } : null),
    } as unknown as ParserRegistryService;

    const runsRepo = {
      listByProjectId: async () => [
        {
          id: 'run-new',
          parser_results: [{ parser_id: 'csharp', status: 'success' }],
        },
        {
          id: 'run-old',
          parser_results: [{ parser_id: 'csharp', status: 'failed' }],
        },
      ],
    };

    const local = new LanguageDetectorService(config, csharpRegistry, runsRepo as never);
    const enriched = await local.enrichWithParserStatus('project-1', [
      {
        language: 'csharp',
        file_count: 10,
        sample_paths: ['a.cs'],
        parser_id: null,
        parser_status: 'missing',
      },
    ]);

    expect(enriched[0]?.parser_status).toBe('available');
  });

  it('keeps failed when the most recent parser result is still failed', async () => {
    const csharpRegistry = {
      ensureLoaded: async () => {},
      resolveParserId: (language: string) => (language === 'csharp' ? 'csharp' : null),
      getManifest: (parserId: string) => (parserId === 'csharp' ? { id: 'csharp' } : null),
    } as unknown as ParserRegistryService;

    const runsRepo = {
      listByProjectId: async () => [
        {
          id: 'run-new',
          parser_results: [{ parser_id: 'csharp', status: 'failed' }],
        },
        {
          id: 'run-old',
          parser_results: [{ parser_id: 'csharp', status: 'success' }],
        },
      ],
    };

    const local = new LanguageDetectorService(config, csharpRegistry, runsRepo as never);
    const enriched = await local.enrichWithParserStatus('project-1', [
      {
        language: 'csharp',
        file_count: 10,
        sample_paths: ['a.cs'],
        parser_id: null,
        parser_status: 'missing',
      },
    ]);

    expect(enriched[0]?.parser_status).toBe('failed');
  });

  it('does not count csproj as csharp language', async () => {
    const root = await createTempGitRepo({
      'src/App.cs': 'class App {}',
      'src/App.csproj': '<Project></Project>',
    });
    const localDetector = new LanguageDetectorService(config, parserRegistry, analysisRunRepository as never);
    const languages = await localDetector.detectLanguages(root);
    const csharp = languages.find((entry) => entry.language === 'csharp');
    expect(csharp?.file_count).toBe(1);
    expect(csharp?.sample_paths).toEqual(['src/App.cs']);
  });
});
