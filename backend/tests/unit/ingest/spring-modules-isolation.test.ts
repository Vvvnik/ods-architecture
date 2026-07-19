import { describe, expect, it } from 'vitest';
import { composeIngestAdapter } from '../../../src/services/ingest/adapters/compose.ingest.js';
import { javaApiRoutesIngestAdapter } from '../../../src/services/ingest/adapters/java-api-routes.ingest.js';
import { javaHttpCallsIngestAdapter } from '../../../src/services/ingest/adapters/java-http-calls.ingest.js';
import { mavenProjectIngestAdapter } from '../../../src/services/ingest/adapters/maven-project.ingest.js';
import { springConfigIngestAdapter } from '../../../src/services/ingest/adapters/spring-config.ingest.js';

const base = { project_id: 'p', analysis_run_id: 'r', schema_version: '1', files_analyzed: [], incremental: false, affected_paths: [], deleted_paths: [] };

describe('Spring artifact module isolation', () => {
  it('accepts empty or malformed models independently', () => {
    for (const adapter of [
      mavenProjectIngestAdapter, springConfigIngestAdapter,
      javaApiRoutesIngestAdapter, javaHttpCallsIngestAdapter,
    ]) {
      expect(adapter.transform(null, { ...base, parser_id: adapter.parser_id })).toEqual({
        nodes: [], edges: [],
      });
    }
  });

  it('compose remains usable independently of Spring adapters', () => {
    const result = composeIngestAdapter.transform({
      compose_file: 'docker-compose.yml',
      services: [{ name: 'customers-service' }],
    }, { ...base, parser_id: 'compose' });
    expect(result.nodes).toHaveLength(1);
  });
});
