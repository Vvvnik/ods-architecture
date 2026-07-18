import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { javaIngestAdapter } from '../../../src/services/ingest/adapters/java.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/java-model-v1.json');

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'java',
  schema_version: '1',
  files_analyzed: [
    'src/main/java/com/example/demo/Greeter.java',
  ],
  incremental: false,
  affected_paths: ['src/main/java/com/example/demo/Greeter.java'],
  deleted_paths: [],
};

describe('javaIngestAdapter', () => {
  it('transforms java symbols into module + namespace + class', async () => {
    const model = JSON.parse(await readFile(fixturePath, 'utf8'));
    const { nodes } = javaIngestAdapter.transform(model, baseContext);

    expect(nodes.every((node) => node.parser_id === 'java')).toBe(true);
    expect(nodes.every((node) => node.language === 'java')).toBe(true);
    expect(nodes.some((node) => node.kind === 'module')).toBe(true);
    expect(nodes.some((node) => node.kind === 'namespace')).toBe(true);
    const cls = nodes.find((node) => node.kind === 'class' && node.name === 'Greeter');
    const ns = nodes.find((node) => node.kind === 'namespace');
    expect(cls).toBeDefined();
    expect(cls?.parent_id).toBe(ns?.id);
  });
});
