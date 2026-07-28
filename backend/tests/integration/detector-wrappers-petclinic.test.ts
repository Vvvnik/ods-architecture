import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LanguageDetectorService } from '../../src/services/language-detector.service.js';
import type { ParserRegistryService } from '../../src/services/parser-registry.service.js';
import { createTempGitRepo } from '../helpers/test-utils.js';

describe('detector wrappers petclinic-like (018 US3)', () => {
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
    resolveParserId: () => null,
    getManifest: () => null,
  } as unknown as ParserRegistryService;

  const analysisRunRepository = { listByProjectId: async () => [] };

  let repoRoot: string;

  beforeEach(async () => {
    repoRoot = await createTempGitRepo({
      mvnw: '#!/bin/sh\nexec java -jar .mvn/wrapper/maven-wrapper.jar "$@"\n',
      gradlew: '#!/bin/sh\nexec gradle "$@"\n',
      'mvnw.cmd': '@ECHO OFF\n',
      'gradlew.bat': '@ECHO OFF\n',
      'scripts/ci.sh': '#!/bin/bash\necho ci\n',
      'spring-petclinic-customers-service/src/main/java/org/springframework/samples/petclinic/customers/CustomersServiceApplication.java':
        'package org.springframework.samples.petclinic.customers; public class CustomersServiceApplication {}',
    });
  });

  afterEach(async () => {
    const { rm } = await import('node:fs/promises');
    await rm(repoRoot, { recursive: true, force: true });
  });

  it('excludes wrappers from shell; keeps real .sh', async () => {
    const detector = new LanguageDetectorService(
      config,
      parserRegistry,
      analysisRunRepository as never,
    );
    const languages = await detector.detectLanguages(repoRoot);
    const shell = languages.find((entry) => entry.language === 'shell');
    const java = languages.find((entry) => entry.language === 'java');

    expect(java?.file_count).toBe(1);
    expect(shell?.file_count).toBe(1);
    expect(shell?.sample_paths).toEqual(['scripts/ci.sh']);
    for (const path of shell?.sample_paths ?? []) {
      expect(path).not.toMatch(/mvnw|gradlew/);
    }
  });
});
