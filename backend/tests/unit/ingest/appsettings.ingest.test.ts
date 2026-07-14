import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { appsettingsIngestAdapter } from '../../../src/services/ingest/adapters/appsettings.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

describe('appsettings.ingest', () => {
  it('maps multiple databases, broker and connects_to edges with system layer', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/appsettings-model-v1.json'), 'utf8'),
    );

    const result = appsettingsIngestAdapter.transform(model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'appsettings',
      schema_version: '1',
      files_analyzed: ['src/Api/appsettings.json'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(result.nodes.filter((node) => node.kind === 'database')).toHaveLength(2);
    expect(result.nodes.filter((node) => node.kind === 'broker')).toHaveLength(1);
    expect(result.edges.filter((edge) => edge.type === 'connects_to')).toHaveLength(3);
    expect(result.edges.every((edge) => edge.from === composeServiceNodeId('Api'))).toBe(true);
    expect(result.nodes.every((node) => node.metadata?.layer === 'system')).toBe(true);
  });
});
