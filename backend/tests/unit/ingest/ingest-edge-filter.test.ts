import { describe, expect, it } from 'vitest';

import { appsettingsIngestAdapter } from '../../../src/services/ingest/adapters/appsettings.ingest.js';
import { composeIngestAdapter } from '../../../src/services/ingest/adapters/compose.ingest.js';
import { openapiIngestAdapter } from '../../../src/services/ingest/adapters/openapi.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

function filterEdgesWithKnownEndpoints(
  nodes: Array<{ id?: string }>,
  edges: Array<{ from: string; to: string; type: string }>,
  existingNodeIds: Set<string>,
) {
  const knownIds = new Set(existingNodeIds);
  for (const node of nodes) {
    if (node.id) {
      knownIds.add(node.id);
    }
  }

  return edges.filter(
    (edge) => Boolean(edge.from && edge.to && knownIds.has(edge.from) && knownIds.has(edge.to)),
  );
}

function mergeWithEdgeFilter(
  composeModel: unknown,
  appsettingsModel: unknown,
  openapiModel: unknown,
) {
  const ctx = {
    project_id: 'p1',
    analysis_run_id: 'r1',
    schema_version: '1' as const,
    incremental: false,
    affected_paths: [] as string[],
    deleted_paths: [] as string[],
  };

  const compose = composeIngestAdapter.transform(composeModel, {
    ...ctx,
    parser_id: 'compose',
    files_analyzed: ['docker-compose.yml'],
  });
  const knownIds = new Set(compose.nodes.map((node) => node.id).filter(Boolean) as string[]);

  const appsettings = appsettingsIngestAdapter.transform(appsettingsModel, {
    ...ctx,
    parser_id: 'appsettings',
    files_analyzed: ['src/Api/appsettings.json'],
  });
  const appsettingsEdges = filterEdgesWithKnownEndpoints(appsettings.nodes, appsettings.edges, knownIds);
  for (const node of appsettings.nodes) {
    if (node.id) {
      knownIds.add(node.id);
    }
  }

  const openapi = openapiIngestAdapter.transform(openapiModel, {
    ...ctx,
    parser_id: 'openapi',
    files_analyzed: ['contracts/openapi.yaml'],
  });
  const openapiEdges = filterEdgesWithKnownEndpoints(openapi.nodes, openapi.edges, knownIds);

  return { compose, appsettingsEdges, openapiEdges };
}

describe('cross-parser edge filtering', () => {
  it('keeps connects_to when compose service exists and drops openapi exposes for contracts hint', () => {
    const { appsettingsEdges, openapiEdges } = mergeWithEdgeFilter(
      {
        compose_file: 'docker-compose.yml',
        services: [{ name: 'api' }],
      },
      {
        sources: [
          {
            path: 'src/Api/appsettings.json',
            service_hint: 'Api',
            bindings: [
              {
                key: 'ConnectionStrings__DefaultConnection',
                binding_type: 'database',
                engine: 'postgres',
                raw_redacted: 'Host=postgres',
              },
            ],
          },
        ],
      },
      {
        specs: [
          {
            path: 'contracts/openapi.yaml',
            service_hint: 'contracts',
            endpoints: [{ method: 'GET', path: '/health' }],
          },
        ],
      },
    );

    expect(appsettingsEdges.some((edge) => edge.type === 'connects_to')).toBe(true);
    expect(appsettingsEdges[0]?.from).toBe(composeServiceNodeId('api'));
    expect(openapiEdges.some((edge) => edge.type === 'exposes')).toBe(false);
    expect(openapiEdges.some((edge) => edge.type === 'documents')).toBe(true);
  });
});
