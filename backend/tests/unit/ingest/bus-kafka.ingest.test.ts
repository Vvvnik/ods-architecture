import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { busKafkaIngestAdapter } from '../../../src/services/ingest/adapters/bus-kafka.ingest.js';
import { composeServiceNodeId } from '../../../src/services/ingest/system-layer.js';

describe('bus-kafka.ingest', () => {
  it('maps message_type, message_topic nodes and bus edges with system layer', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/bus-kafka-model-v1.json'), 'utf8'),
    );

    const result = busKafkaIngestAdapter.transform(model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'bus-kafka',
      schema_version: '1',
      files_analyzed: ['src/Api/OrderPublisher.cs'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(result.nodes.filter((node) => node.kind === 'message_type')).toHaveLength(1);
    expect(result.nodes.filter((node) => node.kind === 'message_topic')).toHaveLength(1);
    expect(result.edges.filter((edge) => edge.type === 'publishes')).toHaveLength(4);
    expect(result.edges.every((edge) => edge.from === composeServiceNodeId('api'))).toBe(true);
    expect(result.nodes.every((node) => node.metadata?.layer === 'system')).toBe(true);
  });
});
