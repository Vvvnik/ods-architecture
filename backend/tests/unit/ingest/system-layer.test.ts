import { describe, expect, it } from 'vitest';

import { composeIngestAdapter } from '../../../src/services/ingest/adapters/compose.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

const ctx = {
  project_id: 'p1',
  analysis_run_id: 'r1',
  parser_id: 'compose',
  schema_version: '1' as const,
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('system-layer compose service ids', () => {
  it('normalizes compose service ids to lowercase stable keys', () => {
    const result = composeIngestAdapter.transform(
      {
        compose_file: 'docker-compose.yml',
        services: [{ name: 'Api', depends_on: [{ service: 'worker' }] }, { name: 'worker' }],
      },
      {
        ...ctx,
        files_analyzed: ['docker-compose.yml'],
      },
    );

    const apiNode = result.nodes.find((node) => node.name === 'Api');
    expect(apiNode?.id).toBe(composeServiceNodeId('Api', 'docker-compose.yml'));
    expect(apiNode?.id).toBe(composeServiceNodeId('api', 'docker-compose.yml'));
  });

  it('includes compose file path in stable key', () => {
    const result = composeIngestAdapter.transform(
      {
        compose_file: 'compose.yaml',
        services: [{ name: 'api' }],
      },
      {
        ...ctx,
        files_analyzed: ['compose.yaml'],
      },
    );

    expect(result.nodes[0]?.id).toBe(composeServiceNodeId('api', 'compose.yaml'));
    expect(result.nodes[0]?.id).not.toBe(composeServiceNodeId('api', 'docker-compose.yml'));
  });
});
