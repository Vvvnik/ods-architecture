import { describe, expect, it } from 'vitest';

import { createSymbolsModelIngestAdapter } from '../../../src/services/ingest/adapters/symbols-model.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const adapter = createSymbolsModelIngestAdapter('java', 'java');

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'java',
  schema_version: '1',
  files_analyzed: ['demo/src/main/java/com/example/App.java'],
  incremental: false,
  affected_paths: ['demo/src/main/java/com/example/App.java'],
  deleted_paths: [],
};

describe('symbols-model parent_qualified_name fallback (018 R3)', () => {
  it('links type to namespace when package uses synthetic path', () => {
    const model = {
      symbols: [
        {
          name: 'App.java',
          kind: 'module',
          path: 'demo/src/main/java/com/example/App.java',
          qualified_name: 'demo/src/main/java/com/example/App.java',
        },
        {
          name: 'example',
          kind: 'namespace',
          path: 'java-package/com/example',
          qualified_name: 'com.example',
        },
        {
          name: 'App',
          kind: 'class',
          path: 'demo/src/main/java/com/example/App.java',
          qualified_name: 'com.example.App',
          parent_qualified_name: 'com.example',
        },
      ],
    };

    const { nodes } = adapter.transform(model, baseContext);
    const ns = nodes.find((node) => node.kind === 'namespace');
    const cls = nodes.find((node) => node.kind === 'class');
    expect(ns).toBeDefined();
    expect(cls?.parent_id).toBe(ns?.id);
  });
});
