import { describe, expect, it } from 'vitest';
import { mavenProjectIngestAdapter } from '../../../src/services/ingest/adapters/maven-project.ingest.js';
import { springConfigIngestAdapter } from '../../../src/services/ingest/adapters/spring-config.ingest.js';
import { javaApiRoutesIngestAdapter } from '../../../src/services/ingest/adapters/java-api-routes.ingest.js';
import { javaHttpCallsIngestAdapter } from '../../../src/services/ingest/adapters/java-http-calls.ingest.js';

const emptyCtx = {
  project_id: 'p',
  analysis_run_id: 'r',
  parser_id: 'x',
  schema_version: '1',
  files_analyzed: [],
  incremental: false,
  affected_paths: [],
  deleted_paths: [],
};

describe('019 module isolation', () => {
  it('empty models produce zero nodes/edges (safe no-op)', () => {
    expect(mavenProjectIngestAdapter.transform({ modules: [] }, { ...emptyCtx, parser_id: 'maven-project' })).toEqual({
      nodes: [],
      edges: [],
    });
    expect(springConfigIngestAdapter.transform({ configs: [] }, { ...emptyCtx, parser_id: 'spring-config' }).nodes).toEqual([]);
    expect(javaApiRoutesIngestAdapter.transform({ routes: [] }, { ...emptyCtx, parser_id: 'java-api-routes' }).nodes).toEqual([]);
    expect(javaHttpCallsIngestAdapter.transform({ calls: [] }, { ...emptyCtx, parser_id: 'java-http-calls' }).edges).toEqual([]);
  });

  it('each adapter has distinct parser_id (detachable modules)', () => {
    expect(new Set([
      mavenProjectIngestAdapter.parser_id,
      springConfigIngestAdapter.parser_id,
      javaApiRoutesIngestAdapter.parser_id,
      javaHttpCallsIngestAdapter.parser_id,
    ]).size).toBe(4);
  });
});
