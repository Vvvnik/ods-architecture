import { describe, expect, it } from 'vitest';
import { springConfigIngestAdapter } from '../../../src/services/ingest/adapters/spring-config.ingest.js';

const ctx = { project_id: 'p', analysis_run_id: 'r', parser_id: 'spring-config', schema_version: '1', files_analyzed: [], incremental: false, affected_paths: [], deleted_paths: [] };

describe('spring-config ingest', () => {
  it('adds port, database and connects_to while skipping placeholders', () => {
    const result = springConfigIngestAdapter.transform({ configs: [{
      source_path: 'customers-service/src/main/resources/application.yml',
      service_hint: 'customers-service', port: 8081,
      datasources: [
        { name: 'customers', jdbc_url: 'jdbc:postgresql://db/customers', engine: 'postgresql' },
        { name: 'bad', jdbc_url: '${DB_URL}', engine: null },
      ],
    }] }, ctx);
    expect(result.nodes.some((node) => node.kind === 'service' && node.metadata?.port === 8081)).toBe(true);
    expect(result.nodes.filter((node) => node.kind === 'database')).toHaveLength(1);
    expect(result.edges).toHaveLength(1);
  });
});
