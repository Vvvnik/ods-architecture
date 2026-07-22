import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  angularjsUiIngestAdapter,
  resolveBindsServiceTarget,
} from '../../src/services/ingest/adapters/angularjs-ui.ingest.js';

const ctx = {
  project_id: '11111111-1111-1111-1111-111111111111',
  analysis_run_id: '22222222-2222-2222-2222-222222222222',
  parser_id: 'angularjs-ui',
  schema_version: '1',
  files_analyzed: [
    'spring-petclinic-api-gateway/src/main/resources/static/scripts/app.js',
  ],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('ingest angularjs-ui (021)', () => {
  it('ingests example native tree into ui_route/ui_screen nodes', async () => {
    const examplePath = join(
      process.cwd(),
      '../specs/021-angularjs-ui-landscape/contracts/native-ui-tree-angularjs.example.json',
    );
    let model: unknown;
    try {
      model = JSON.parse(await readFile(examplePath, 'utf8'));
    } catch {
      model = {
        apps: [
          {
            stable_key: 'gateway-static',
            name: 'Petclinic UI',
            framework: 'angularjs',
            language: 'javascript',
            entry_path:
              'spring-petclinic-api-gateway/src/main/resources/static/scripts/app.js',
            routes: [
              {
                stable_key: 'welcome',
                path_pattern: '/welcome',
                screen: { stable_key: 'welcome', name: 'Welcome' },
              },
              {
                stable_key: 'owners',
                path_pattern: '/owners',
                screen: {
                  stable_key: 'owner-list',
                  name: 'Owner list',
                  api_calls: [{ method: 'GET', path_template: '/api/customer/owners' }],
                },
              },
            ],
          },
        ],
      };
    }

    const result = angularjsUiIngestAdapter.transform(model, ctx);
    expect(result.nodes.some((n) => n.kind === 'ui_app')).toBe(true);
    expect(result.nodes.filter((n) => n.kind === 'ui_route').length).toBeGreaterThanOrEqual(2);
    expect(result.nodes.filter((n) => n.kind === 'ui_screen').length).toBeGreaterThanOrEqual(2);
  });
});

describe('ingest angularjs-ui invokes_api (021)', () => {
  it('emits unresolved invokes_api from screen api_calls', () => {
    const model = {
      apps: [
        {
          stable_key: 'gw',
          name: 'UI',
          framework: 'angularjs',
          language: 'javascript',
          entry_path:
            'spring-petclinic-api-gateway/src/main/resources/static/scripts/app.js',
          routes: [
            {
              stable_key: 'owners',
              path_pattern: '/owners',
              screen: {
                stable_key: 'owners',
                name: 'Owners',
                api_calls: [{ method: 'GET', path_template: '/api/customer/owners' }],
              },
            },
          ],
        },
      ],
    };
    const result = angularjsUiIngestAdapter.transform(model, ctx);
    const edge = result.edges.find((e) => e.type === 'invokes_api');
    expect(edge).toBeTruthy();
    expect(edge?.metadata?.unresolved_api === true || edge?.to).toBeTruthy();
  });
});

describe('ingest angularjs-ui binds_service (021)', () => {
  it('links ui_app to api-gateway for gateway static paths', () => {
    const model = {
      apps: [
        {
          stable_key: 'spring-petclinic-api-gateway-static',
          name: 'Petclinic UI',
          framework: 'angularjs',
          entry_path:
            'spring-petclinic-api-gateway/src/main/resources/static/scripts/app.js',
          routes: [],
        },
      ],
    };

    const result = angularjsUiIngestAdapter.transform(model, ctx);
    const edge = result.edges.find((e) => e.type === 'binds_service');
    const expected = resolveBindsServiceTarget(model.apps[0]);

    expect(edge?.from).toContain('angularjs-ui:ui_app:');
    expect(edge?.to).toBe(expected);
    expect(edge?.to).toContain('api-gateway');
  });

  it('resolveBindsServiceTarget respects explicit override', () => {
    expect(
      resolveBindsServiceTarget({
        stable_key: 'spa',
        name: 'spa',
        binds_service_id: 'compose:service:api-gateway',
      }),
    ).toBe('compose:service:api-gateway');
  });
});
