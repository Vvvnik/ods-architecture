import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { reactUiIngestAdapter } from '../../src/services/ingest/adapters/react-ui.ingest.js';

const ctx = {
  project_id: '11111111-1111-1111-1111-111111111111',
  analysis_run_id: '22222222-2222-2222-2222-222222222222',
  parser_id: 'react-ui',
  schema_version: '1',
  files_analyzed: ['frontend/src/app/router.tsx'],
  incremental: false,
  affected_paths: [] as string[],
  deleted_paths: [] as string[],
};

describe('ingest react-ui (020)', () => {
  it('maps native apps to UI nodes/edges with layer=ui', async () => {
    const model = JSON.parse(
      await readFile(
        join(
          process.cwd(),
          '../specs/020-ui-landscape-from-code/contracts/native-ui-tree.example.json',
        ),
        'utf8',
      ),
    );

    const result = reactUiIngestAdapter.transform(model, ctx);

    expect(result.nodes.some((node) => node.kind === 'ui_app')).toBe(true);
    expect(result.nodes.some((node) => node.kind === 'ui_route')).toBe(true);
    expect(result.nodes.some((node) => node.kind === 'ui_screen')).toBe(true);
    expect(result.nodes.some((node) => node.kind === 'ui_flow')).toBe(true);
    expect(result.nodes.some((node) => node.kind === 'ui_style')).toBe(true);
    expect(result.nodes.every((node) => node.metadata?.layer === 'ui')).toBe(true);

    expect(result.edges.some((edge) => edge.type === 'contains')).toBe(true);
    expect(result.edges.some((edge) => edge.type === 'navigates_to')).toBe(true);
    expect(result.edges.some((edge) => edge.type === 'uses_style')).toBe(true);
    expect(result.edges.some((edge) => edge.type === 'binds_field')).toBe(true);
    expect(result.edges.every((edge) => edge.metadata?.layer === 'ui')).toBe(true);
  });

  it('returns empty graph for empty apps', () => {
    const result = reactUiIngestAdapter.transform({ apps: [] }, ctx);
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
  });
});
