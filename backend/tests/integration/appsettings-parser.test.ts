import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appsettingsIngestAdapter } from '../../src/services/ingest/adapters/appsettings.ingest.js';
import { composeServiceNodeId } from '../../src/services/ingest/system-layer.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('appsettings parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-appsettings-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    const appsettingsPath = join(repoRoot, 'src/Api/appsettings.json');
    mkdirSync(join(repoRoot, 'src/Api'), { recursive: true });
    writeFileSync(
      appsettingsPath,
      JSON.stringify(
        {
          ConnectionStrings: {
            DefaultConnection: 'Host=postgres;Database=ods;Username=ods;Password=secret',
            AnalyticsConnection: 'Host=postgres;Database=analytics;Username=ods;Password=secret',
          },
          RabbitMQ: {
            Host: 'rabbit',
          },
        },
        null,
        2,
      ),
      'utf8',
    );

    runParserCli({
      parserId: 'appsettings',
      entry: 'run.mjs',
      workingCopyRoot: repoRoot,
      files: ['src/Api/appsettings.json'],
      outputPath,
      install: false,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes appsettings envelope and ingests database + connects_to', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      model: { sources: Array<{ bindings: Array<{ binding_type: string }> }> };
    };

    expect(envelope.parser_id).toBe('appsettings');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.model.sources[0]?.bindings.some((binding) => binding.binding_type === 'database')).toBe(
      true,
    );

    const ingested = appsettingsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'appsettings',
      schema_version: '1',
      files_analyzed: ['src/Api/appsettings.json'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.filter((node) => node.kind === 'database')).toHaveLength(2);
    expect(ingested.nodes.some((node) => node.kind === 'broker')).toBe(true);
    expect(ingested.edges.filter((edge) => edge.type === 'connects_to')).toHaveLength(3);
    expect(ingested.edges.every((edge) => edge.from === composeServiceNodeId('Api'))).toBe(true);
  });
});
