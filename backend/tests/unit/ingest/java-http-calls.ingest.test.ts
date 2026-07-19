import { describe, expect, it } from 'vitest';
import { javaHttpCallsIngestAdapter } from '../../../src/services/ingest/adapters/java-http-calls.ingest.js';

const ctx = { project_id: 'p', analysis_run_id: 'r', parser_id: 'java-http-calls', schema_version: '1', files_analyzed: [], incremental: false, affected_paths: [], deleted_paths: [] };

describe('java-http-calls ingest', () => {
  it('links caller to Java code endpoint without creating endpoint', () => {
    const result = javaHttpCallsIngestAdapter.transform({ calls: [{
      method: 'GET', path: '/vets/{id}', source_path: 'customers-service/src/main/java/V.java',
      service_hint: 'customers-service', callee_service_hint: 'vets-service', client_kind: 'feign',
    }] }, ctx);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges[0].to).toContain('java-api-routes:http_endpoint:');
    expect(result.edges[0].metadata?.client_kind).toBe('feign');
  });

  it('accepts restclient client_kind', () => {
    const result = javaHttpCallsIngestAdapter.transform({ calls: [{
      method: 'GET', path: '/owners', source_path: 'genai-service/src/main/java/A.java',
      service_hint: 'genai-service', callee_service_hint: 'customers-service', client_kind: 'restclient',
    }] }, ctx);
    expect(result.edges[0].metadata?.client_kind).toBe('restclient');
  });

  it('skips calls without a resolvable callee', () => {
    expect(javaHttpCallsIngestAdapter.transform({ calls: [{
      method: 'GET', path: '/unknown', source_path: 'a.java', client_kind: 'webclient',
    }] }, ctx).edges).toHaveLength(0);
  });
});
