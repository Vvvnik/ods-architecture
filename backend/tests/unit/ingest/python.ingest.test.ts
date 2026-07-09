import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { pythonIngestAdapter } from '../../../src/services/ingest/adapters/python.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/python-model-v1.json');

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'python',
  schema_version: '1',
  files_analyzed: ['app.py'],
  incremental: false,
  affected_paths: ['app.py'],
  deleted_paths: [],
};

describe('pythonIngestAdapter', () => {
  it('transforms fixture model into canonical nodes and edges', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const model = JSON.parse(raw);

    const { nodes, edges } = pythonIngestAdapter.transform(model, baseContext);

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.name).sort()).toEqual(['app.py', 'main']);
    expect(nodes.every((node) => node.parser_id === 'python')).toBe(true);
    expect(nodes.every((node) => node.language === 'python')).toBe(true);
    expect(nodes.every((node) => node.id?.startsWith('python:'))).toBe(true);

    expect(edges).toHaveLength(1);
    expect(edges[0]?.type).toBe('imports');
    expect(edges.every((edge) => edge.parser_id === 'python')).toBe(true);
  });
});
