import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { cppIngestAdapter } from '../../../src/services/ingest/adapters/cpp.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/cpp-model-v1.json');

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'cpp',
  schema_version: '1',
  files_analyzed: ['src/main.cpp'],
  incremental: false,
  affected_paths: ['src/main.cpp'],
  deleted_paths: [],
};

describe('cppIngestAdapter', () => {
  it('transforms fixture model into canonical nodes and edges', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const model = JSON.parse(raw);

    const { nodes, edges } = cppIngestAdapter.transform(model, baseContext);

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.name).sort()).toEqual(['main', 'main.cpp']);
    expect(nodes.every((node) => node.parser_id === 'cpp')).toBe(true);
    expect(nodes.every((node) => node.language === 'cpp')).toBe(true);
    expect(nodes.every((node) => node.id?.startsWith('cpp:'))).toBe(true);

    expect(edges).toHaveLength(1);
    expect(edges[0]?.type).toBe('imports');
    expect(edges.every((edge) => edge.parser_id === 'cpp')).toBe(true);
  });
});
