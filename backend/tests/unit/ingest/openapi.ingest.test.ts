import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { openapiIngestAdapter } from '../../../src/services/ingest/adapters/openapi.ingest.js';

describe('openapi.ingest', () => {
  it('maps http_endpoint nodes and documents edges with system layer', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/openapi-model-v1.json'), 'utf8'),
    );

    const result = openapiIngestAdapter.transform(model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'openapi',
      schema_version: '1',
      files_analyzed: ['contracts/openapi.yaml'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(result.nodes.filter((node) => node.kind === 'http_endpoint')).toHaveLength(2);
    expect(result.nodes.filter((node) => node.kind === 'external_api')).toHaveLength(1);
    expect(result.edges.filter((edge) => edge.type === 'documents')).toHaveLength(2);
    expect(result.nodes.every((node) => node.metadata?.layer === 'system')).toBe(true);
  });

  it('does not emit exposes for contracts folder service hint', () => {
    const result = openapiIngestAdapter.transform(
      {
        specs: [
          {
            path: 'contracts/openapi.yaml',
            service_hint: 'contracts',
            endpoints: [{ method: 'GET', path: '/api/v1/health' }],
          },
        ],
      },
      {
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'openapi',
        schema_version: '1',
        files_analyzed: ['contracts/openapi.yaml'],
        incremental: false,
        affected_paths: [],
        deleted_paths: [],
      },
    );

    expect(result.edges.some((edge) => edge.type === 'exposes')).toBe(false);
    expect(result.edges.some((edge) => edge.type === 'documents')).toBe(true);
  });
});
