import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LanguageDetectorService } from '../../src/services/language-detector.service.js';
import type { ParserRegistryService } from '../../src/services/parser-registry.service.js';
import { createTempGitRepo } from '../helpers/test-utils.js';

describe('detector java wrappers (018)', () => {
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
    ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
  };

  const parserRegistry = {
    ensureLoaded: async () => {},
    resolveParserId: () => null,
    getManifest: () => null,
  } as unknown as ParserRegistryService;

  const analysisRunRepository = { listByProjectId: async () => [] };

  let repoRoot: string;
  let detector: LanguageDetectorService;

  beforeEach(async () => {
    repoRoot = await createTempGitRepo({
      mvnw: '#!/bin/sh\necho mvn\n',
      gradlew: '#!/bin/sh\necho gradle\n',
      'scripts/run.sh': '#!/bin/sh\necho hi\n',
      'src/main/java/App.java': 'class App {}',
    });
    detector = new LanguageDetectorService(config, parserRegistry, analysisRunRepository as never);
  });

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(repoRoot, { recursive: true, force: true });
  });

  it('ignores mvnw/gradlew and keeps .sh as shell', async () => {
    const languages = await detector.detectLanguages(repoRoot);
    const shell = languages.find((entry) => entry.language === 'shell');
    const java = languages.find((entry) => entry.language === 'java');
    expect(java?.file_count).toBe(1);
    expect(shell?.file_count).toBe(1);
    expect(shell?.sample_paths).toEqual(['scripts/run.sh']);
    expect(shell?.sample_paths?.some((p) => p.includes('mvnw') || p.includes('gradlew'))).toBe(
      false,
    );
  });
});
