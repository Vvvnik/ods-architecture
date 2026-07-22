import { describe, expect, it } from 'vitest';
import { findMatchingCodeHttpEndpoint } from '../../../src/services/ingest/openapi-code-merge.js';
import { openapiIngestAdapter } from '../../../src/services/ingest/adapters/openapi.ingest.js';

describe('openapi↔code merge', () => {
  it('finds unique METHOD+path match', () => {
    const hit = findMatchingCodeHttpEndpoint(
      [
        { id: 'java-api-routes:http_endpoint:customers|GET|/owners', method: 'GET', path: '/owners', service_name: 'customers-service' },
      ],
      'GET',
      '/owners',
      'customers-service',
    );
    expect(hit?.id).toContain('java-api-routes');
  });

  it('skips creating OpenAPI endpoint when code match exists', () => {
    const result = openapiIngestAdapter.transform(
      {
        specs: [
          {
            path: 'customers-service/openapi.yaml',
            service_hint: 'customers-service',
            endpoints: [{ method: 'GET', path: '/owners', operation_id: 'listOwners' }],
          },
        ],
      },
      {
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'openapi',
        schema_version: '1',
        files_analyzed: ['customers-service/openapi.yaml'],
        incremental: false,
        affected_paths: [],
        deleted_paths: [],
        code_http_endpoints: [
          {
            id: 'java-api-routes:http_endpoint:customers-service|GET|/owners',
            method: 'GET',
            path: '/owners',
            service_name: 'customers-service',
          },
        ],
      },
    );

    expect(result.nodes.filter((n) => n.kind === 'http_endpoint')).toHaveLength(0);
    expect(result.nodes.filter((n) => n.kind === 'external_api')).toHaveLength(1);
    const docs = result.edges.filter((e) => e.type === 'documents');
    expect(docs).toHaveLength(1);
    expect(docs[0].to).toBe('java-api-routes:http_endpoint:customers-service|GET|/owners');
    expect(docs[0].metadata?.merged_with_code).toBe(true);
  });
});
