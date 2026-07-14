import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { busRabbitIngestAdapter } from '../../../src/services/ingest/adapters/bus-rabbit.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

describe('bus-rabbit.ingest', () => {
  it('maps message_type nodes and consumes edges with system layer', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/bus-rabbit-model-v1.json'), 'utf8'),
    );

    const result = busRabbitIngestAdapter.transform(model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'bus-rabbit',
      schema_version: '1',
      files_analyzed: ['src/Worker/OrderCreatedListener.cs'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(result.nodes.filter((node) => node.kind === 'message_type')).toHaveLength(1);
    expect(result.edges.filter((edge) => edge.type === 'consumes')).toHaveLength(1);
    expect(result.edges[0]?.from).toBe(composeServiceNodeId('worker'));
    expect(result.nodes.every((node) => node.metadata?.layer === 'system')).toBe(true);
  });
});
