import { describe, expect, it } from 'vitest';

import {
  reactUiIngestAdapter,
  resolveBindsServiceTarget,
} from '../../src/services/ingest/adapters/react-ui.ingest.js';
import { composeServiceNodeId } from '../../src/services/ingest/system-layer.js';

const ctx = {
  project_id: '11111111-1111-1111-1111-111111111111',
  analysis_run_id: '22222222-2222-2222-2222-222222222222',
  parser_id: 'react-ui',
  schema_version: '1',
  files_analyzed: ['frontend/src/main.tsx'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('ingest react-ui binds_service (020)', () => {
  it('links ui_app to compose frontend service for dogfood paths', () => {
    const model = {
      apps: [
        {
          stable_key: 'frontend',
          name: 'ods-frontend',
          framework: 'react',
          entry_path: 'frontend/src/main.tsx',
          routes: [],
        },
      ],
    };

    const result = reactUiIngestAdapter.transform(model, ctx);
    const edge = result.edges.find((e) => e.type === 'binds_service');
    const expected = composeServiceNodeId('frontend', 'docker/docker-compose.dev.yml');

    expect(edge?.from).toBe('react-ui:ui_app:frontend');
    expect(edge?.to).toBe(expected);
  });

  it('resolveBindsServiceTarget respects explicit override', () => {
    expect(
      resolveBindsServiceTarget({
        stable_key: 'spa',
        name: 'spa',
        binds_service_id: 'compose:service:frontend',
      }),
    ).toBe('compose:service:frontend');
  });
});
