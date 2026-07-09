import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { typescriptIngestAdapter } from '../../../src/services/ingest/adapters/typescript.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const fixturePath = join(
  process.cwd(),
  'tests/fixtures/ingest/typescript-model-v1.json',
);

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'typescript',
  schema_version: '1',
  files_analyzed: ['src/main.ts', 'lib/util.ts'],
  incremental: false,
  affected_paths: ['src/main.ts', 'lib/util.ts'],
  deleted_paths: [],
};

describe('typescriptIngestAdapter', () => {
  it('transforms fixture model into canonical nodes and edges', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const model = JSON.parse(raw);

    const { nodes, edges } = typescriptIngestAdapter.transform(model, baseContext);

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.name).sort()).toEqual(['main', 'util']);
    expect(nodes.every((node) => node.parser_id === 'typescript')).toBe(true);
    expect(nodes.every((node) => node.id?.startsWith('typescript:'))).toBe(true);

    expect(edges).toHaveLength(1);
    expect(edges[0]?.type).toBe('imports');
    expect(edges[0]?.from).toContain('main');
    expect(edges[0]?.to).toContain('util');
  });
});
