import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { busRabbitIngestAdapter } from '../../src/services/ingest/adapters/bus-rabbit.ingest.js';
import { composeServiceNodeId } from '../../src/services/ingest/system-layer.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('bus-rabbit parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-bus-rabbit-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    mkdirSync(join(repoRoot, 'src/Worker'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'src/Worker/OrderCreatedListener.cs'),
      `using RabbitMQ.Client;

namespace Demo.Worker;

public sealed class OrderCreatedListener
{
    public void OnOrderCreated(OrderCreatedMessage message) { }
}
`,
      'utf8',
    );

    runParserCli({
      parserId: 'bus-rabbit',
      workingCopyRoot: repoRoot,
      files: ['src/Worker/OrderCreatedListener.cs'],
      outputPath,
      install: false,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes bus-rabbit envelope and ingests consumes edges', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      model: { handlers: Array<{ message_type: string }> };
    };

    expect(envelope.parser_id).toBe('bus-rabbit');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.model.handlers.length).toBeGreaterThan(0);

    const ingested = busRabbitIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'bus-rabbit',
      schema_version: '1',
      files_analyzed: ['src/Worker/OrderCreatedListener.cs'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.some((node) => node.kind === 'message_type')).toBe(true);
    expect(ingested.edges.some((edge) => edge.type === 'consumes')).toBe(true);
    expect(ingested.edges[0]?.from).toBe(composeServiceNodeId('worker'));
  });
});
