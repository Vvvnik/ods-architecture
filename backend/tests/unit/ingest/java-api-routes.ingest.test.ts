import { describe, expect, it } from 'vitest';
import { javaApiRoutesIngestAdapter } from '../../../src/services/ingest/adapters/java-api-routes.ingest.js';

const ctx = { project_id: 'p', analysis_run_id: 'r', parser_id: 'java-api-routes', schema_version: '1', files_analyzed: [], incremental: false, affected_paths: [], deleted_paths: [] };

describe('java-api-routes ingest', () => {
  it('creates Java code endpoint and exposes edge', () => {
    const result = javaApiRoutesIngestAdapter.transform({ routes: [{
      method: 'GET', path: '/owners/{id}', source_path: 'customers-service/src/main/java/C.java',
      service_hint: 'customers-service', route_kind: 'mvc',
    }] }, ctx);
    expect(result.nodes[0].id).toContain('java-api-routes:http_endpoint:');
    expect(result.nodes[0].language).toBe('java');
    expect(result.nodes[0].metadata?.source).toBe('code');
    expect(result.nodes[0].metadata?.route_kind).toBe('mvc');
    expect(result.edges[0].type).toBe('exposes');
  });

  it('preserves gateway route_kind from YAML extract', () => {
    const result = javaApiRoutesIngestAdapter.transform({ routes: [{
      method: 'GET', path: '/api/vet', source_path: 'api-gateway/src/main/resources/application.yml',
      service_hint: 'api-gateway', route_kind: 'gateway',
    }] }, ctx);
    expect(result.nodes[0].metadata?.route_kind).toBe('gateway');
  });
});
