import { describe, expect, it } from 'vitest';

import { composeIngestAdapter } from '../../src/services/ingest/adapters/compose.ingest.js';
import { javaIngestAdapter } from '../../src/services/ingest/adapters/java.ingest.js';
import {
  IngestRegistryService,
  registerBuiltinIngestAdapters,
} from '../../src/services/ingest/ingest-registry.service.js';
import { LanguageDetectorService } from '../../src/services/language-detector.service.js';
import type { ParserRegistryService } from '../../src/services/parser-registry.service.js';

describe('java module isolation (018 US4)', () => {
  it('builtins keep compose when java adapter is present', () => {
    const registry = new IngestRegistryService();
    registerBuiltinIngestAdapters(registry);
    expect(registry.get('java')).toBe(javaIngestAdapter);
    expect(registry.get('compose')).toBe(composeIngestAdapter);
  });

  it('registry without java → java language report is missing; compose still available', async () => {
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
      resolveParserId: (language: string) => (language === 'compose' ? 'compose' : null),
      getManifest: (parserId: string) =>
        parserId === 'compose' ? { id: 'compose' } : null,
    } as unknown as ParserRegistryService;

    const detector = new LanguageDetectorService(config, parserRegistry, {
      listByProjectId: async () => [],
    } as never);

    const enriched = await detector.enrichWithParserStatus('project-1', [
      { language: 'java', file_count: 10, sample_paths: ['src/main/java/A.java'] },
      { language: 'typescript', file_count: 2, sample_paths: ['a.ts'] },
    ]);

    const java = enriched.find((e) => e.language === 'java');
    expect(java?.parser_status).toBe('missing');
    expect(java?.parser_id).toBeNull();
  });

  it('empty java symbols model is successful no-op transform', () => {
    const result = javaIngestAdapter.transform(
      { symbols: [] },
      {
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'java',
        schema_version: '1',
        files_analyzed: [],
        incremental: false,
        affected_paths: [],
        deleted_paths: [],
      },
    );
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
