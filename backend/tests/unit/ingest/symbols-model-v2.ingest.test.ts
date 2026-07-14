import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { typescriptIngestAdapter } from '../../../src/services/ingest/adapters/typescript.ingest.js';
import { csharpIngestAdapter } from '../../../src/services/ingest/adapters/csharp.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'typescript',
  schema_version: '2',
  files_analyzed: ['create.ts', 'save.ts'],
  incremental: false,
  affected_paths: ['create.ts', 'save.ts'],
  deleted_paths: [],
};

describe('symbols model v2 ingest', () => {
  it('maps usages calls to canonical edges with layer=code', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/typescript-model-v2.json'), 'utf8'),
    );

    const { nodes, edges } = typescriptIngestAdapter.transform(model, baseContext);

    expect(nodes.every((node) => node.metadata?.layer === 'code')).toBe(true);
    const calls = edges.filter((edge) => edge.type === 'calls');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.metadata?.layer).toBe('code');
    expect(calls[0]?.from).toContain('create');
    expect(calls[0]?.to).toContain('save');
  });

  it('maps csharp injects and calls from model v2', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/csharp-model-v2.json'), 'utf8'),
    );
    const ctx: IngestContext = {
      ...baseContext,
      parser_id: 'csharp',
      schema_version: '2',
      files_analyzed: ['Service.cs', 'Repo.cs'],
      affected_paths: ['Service.cs', 'Repo.cs'],
    };

    const { edges } = csharpIngestAdapter.transform(model, ctx);
    expect(edges.some((edge) => edge.type === 'calls')).toBe(true);
    expect(edges.some((edge) => edge.type === 'injects')).toBe(true);
  });

  it('skips usages when to is unresolved', () => {
    const model = {
      symbols: [{ name: 'a', kind: 'function', path: 'a.ts', qualified_name: 'a' }],
      usages: [{ from: 'a', to: 'missing', type: 'calls', path: 'a.ts' }],
    };
    const { edges } = typescriptIngestAdapter.transform(model, baseContext);
    expect(edges.filter((edge) => edge.type === 'calls')).toHaveLength(0);
  });
});
