import { describe, expect, it } from 'vitest';

import { reactUiIngestAdapter } from '../../src/services/ingest/adapters/react-ui.ingest.js';
import { apiHintNodeId } from '../../src/services/ingest/ui-layer.js';

const ctx = {
  project_id: '11111111-1111-1111-1111-111111111111',
  analysis_run_id: '22222222-2222-2222-2222-222222222222',
  parser_id: 'react-ui',
  schema_version: '1',
  files_analyzed: ['frontend/src/pages/ImportPage.tsx'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('ingest react-ui invokes_api (020)', () => {
  it('emits unresolved hint when endpoint cannot be joined', () => {
    const model = {
      apps: [
        {
          stable_key: 'frontend',
          name: 'frontend',
          framework: 'react',
          entry_path: 'frontend/src/main.tsx',
          routes: [
            {
              stable_key: 'import',
              path_pattern: '/import',
              screen: {
                stable_key: 'ImportPage',
                name: 'Import',
                source_path: 'frontend/src/pages/ImportPage.tsx',
                components: [
                  {
                    stable_key: 'form',
                    name: 'Form',
                    controls: [
                      {
                        stable_key: 'submit',
                        control_kind: 'button',
                        api_calls: [{ method: 'POST', path_template: '/projects' }],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = reactUiIngestAdapter.transform(model, ctx);
    const hintId = apiHintNodeId('react-ui', 'POST', '/projects');
    const edge = result.edges.find((e) => e.type === 'invokes_api');

    expect(edge?.to).toBe(hintId);
    expect(edge?.metadata?.unresolved_api).toBe(true);
    expect(result.nodes.some((node) => node.id === hintId)).toBe(true);
    expect(result.nodes.find((node) => node.id === hintId)?.kind).not.toBe('http_endpoint');
  });

  it('joins invokes_api when endpoint_lookup or resolved_endpoint_hint is present', () => {
    const endpointId = 'ts-api-routes:http_endpoint:docker/docker-compose.dev.yml#backend|POST|/projects';
    const model = {
      endpoint_lookup: {
        'POST:/projects': endpointId,
      },
      apps: [
        {
          stable_key: 'frontend',
          name: 'frontend',
          framework: 'react',
          entry_path: 'frontend/src/main.tsx',
          routes: [
            {
              stable_key: 'import',
              path_pattern: '/import',
              screen: {
                stable_key: 'ImportPage',
                name: 'Import',
                components: [
                  {
                    stable_key: 'form',
                    name: 'Form',
                    controls: [
                      {
                        stable_key: 'submit',
                        control_kind: 'button',
                        api_calls: [
                          {
                            method: 'POST',
                            path_template: '/projects',
                          },
                          {
                            method: 'GET',
                            path_template: '/health',
                            resolved_endpoint_hint:
                              'ts-api-routes:http_endpoint:docker/docker-compose.dev.yml#backend|GET|/health',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = reactUiIngestAdapter.transform(model, ctx);
    const edges = result.edges.filter((e) => e.type === 'invokes_api');

    expect(edges).toHaveLength(2);
    expect(edges.every((edge) => edge.metadata?.unresolved_api === false)).toBe(true);
    expect(edges.map((e) => e.to).sort()).toEqual(
      [
        endpointId,
        'ts-api-routes:http_endpoint:docker/docker-compose.dev.yml#backend|GET|/health',
      ].sort(),
    );
    expect(result.nodes.every((node) => node.kind !== 'http_endpoint')).toBe(true);
  });
});
