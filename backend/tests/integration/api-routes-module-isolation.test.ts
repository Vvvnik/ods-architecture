import { describe, expect, it } from 'vitest';

import {
  IngestRegistryService,
  registerBuiltinIngestAdapters,
} from '../../src/services/ingest/ingest-registry.service.js';
import { tsApiRoutesIngestAdapter } from '../../src/services/ingest/adapters/ts-api-routes.ingest.js';

describe('api-routes module isolation (US4)', () => {
  it('missing ts-api-routes adapter does not remove compose/typescript adapters', () => {
    const registry = new IngestRegistryService();
    registerBuiltinIngestAdapters(registry);
    expect(registry.get('compose')).toBeTruthy();
    expect(registry.get('typescript')).toBeTruthy();
    expect(registry.get('ts-api-routes')).toBe(tsApiRoutesIngestAdapter);
  });

  it('empty routes model is a successful no-op transform', () => {
    const result = tsApiRoutesIngestAdapter.transform(
      { routes: [] },
      {
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'ts-api-routes',
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
