import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { composeIngestAdapter } from '../../../src/services/ingest/adapters/compose.ingest.js';

describe('compose.ingest', () => {
  it('maps services and depends_on edges with system layer', async () => {
    const model = JSON.parse(
      await readFile(
        join(process.cwd(), 'tests/fixtures/ingest/compose-model-v1.json'),
        'utf8',
      ),
    );

    const result = composeIngestAdapter.transform(model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      schema_version: '1',
      files_analyzed: ['docker-compose.yml'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(result.nodes.filter((node) => node.kind === 'service')).toHaveLength(2);
    expect(result.edges.filter((edge) => edge.type === 'depends_on')).toHaveLength(1);
    expect(result.nodes.every((node) => node.metadata?.layer === 'system')).toBe(true);
  });
});
