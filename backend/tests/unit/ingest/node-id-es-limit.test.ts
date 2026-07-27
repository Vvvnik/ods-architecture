import { describe, expect, it } from 'vitest';

import {
  MAX_LOGICAL_GRAPH_ID_BYTES,
  buildEdgeId,
  buildNodeId,
  fitLogicalIdForEs,
  utf8ByteLength,
} from '../../../src/services/ingest/node-id.js';

describe('fitLogicalIdForEs', () => {
  it('keeps short ids unchanged', () => {
    const id = 'typescript:src/main.ts:function:main';
    expect(fitLogicalIdForEs(id)).toBe(id);
  });

  it('shortens oversized ids under ES logical limit', () => {
    const longPath = `Large.Monorepo.App/${'modules/'.repeat(40)}custom-multiple-select-config.component.ts`;
    const full = `typescript:${longPath}:module:${longPath}`;
    expect(utf8ByteLength(full)).toBeGreaterThan(MAX_LOGICAL_GRAPH_ID_BYTES);

    const fitted = fitLogicalIdForEs(full);
    expect(utf8ByteLength(fitted)).toBeLessThanOrEqual(MAX_LOGICAL_GRAPH_ID_BYTES);
    expect(fitted.startsWith('typescript:h:')).toBe(true);
    expect(fitted).toBe(fitLogicalIdForEs(full));
  });

  it('buildNodeId applies the same limit including analysis_run prefix room', () => {
    const longPath = `a/${'b/'.repeat(200)}file.ts`;
    const id = buildNodeId({
      parser_id: 'csharp',
      path: longPath,
      kind: 'module',
      qualified_name: longPath,
    });
    const esDocId = `00000000-0000-4000-8000-000000000001:${id}`;
    expect(utf8ByteLength(esDocId)).toBeLessThanOrEqual(512);
  });

  it('buildEdgeId shortens when from/to/path would overflow', () => {
    const long = 'x'.repeat(300);
    const id = buildEdgeId({
      parser_id: 'typescript',
      path: long,
      type: 'calls',
      from: long,
      to: long,
    });
    expect(utf8ByteLength(`run:${id}`)).toBeLessThanOrEqual(512);
  });
});
