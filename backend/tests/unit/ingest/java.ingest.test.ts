import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { javaIngestAdapter } from '../../../src/services/ingest/adapters/java.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const v1Path = join(process.cwd(), 'tests/fixtures/ingest/java-model-v1.json');
const v2Path = join(process.cwd(), 'tests/fixtures/ingest/java-model-v2.json');

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'java',
  schema_version: '1',
  files_analyzed: ['src/main/java/com/example/demo/Greeter.java'],
  incremental: false,
  affected_paths: ['src/main/java/com/example/demo/Greeter.java'],
  deleted_paths: [],
};

describe('javaIngestAdapter', () => {
  it('transforms java symbols into module + namespace + class', async () => {
    const model = JSON.parse(await readFile(v1Path, 'utf8'));
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

  it('maps v2 usages calls to canonical edges with layer=code', async () => {
    const model = JSON.parse(await readFile(v2Path, 'utf8'));
    const context: IngestContext = {
      ...baseContext,
      schema_version: '2',
      files_analyzed: ['module-alpha/src/main/java/ods/alpha/Service.java'],
      affected_paths: ['module-alpha/src/main/java/ods/alpha/Service.java'],
    };
    const { nodes, edges } = javaIngestAdapter.transform(model, context);
    expect(nodes.some((node) => node.kind === 'method' && node.name === 'create')).toBe(true);
    const calls = edges.filter((edge) => edge.type === 'calls');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.metadata?.layer).toBe('code');
    expect(nodes.every((node) => node.metadata?.layer === 'code')).toBe(true);
  });

  it('supports schema versions 1 and 2', () => {
    expect(javaIngestAdapter.supported_schema_versions).toEqual(['1', '2']);
  });
});
