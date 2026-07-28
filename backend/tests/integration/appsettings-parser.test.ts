import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { appsettingsIngestAdapter } from '../../src/services/ingest/adapters/appsettings.ingest.js';
import { composeServiceNodeId } from '../../src/services/ingest/system-layer.js';
import { runParserCli } from '../helpers/parser-cli.js';

type Binding = {
  key: string;
  binding_type: string;
  engine?: string;
  target_hint?: string;
};

function runAppsettings(repoRoot: string, outputPath: string, relativePath: string, doc: unknown) {
  const abs = join(repoRoot, relativePath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, JSON.stringify(doc, null, 2), 'utf8');
  runParserCli({
    parserId: 'appsettings',
    entry: 'run.mjs',
    workingCopyRoot: repoRoot,
    files: [relativePath],
    outputPath,
    install: false,
  });
  return JSON.parse(readFileSync(outputPath, 'utf8')) as {
    parser_id: string;
    schema_version: string;
    model: { sources: Array<{ bindings: Binding[]; service_hint?: string }> };
  };
}

describe('appsettings parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-appsettings-repo-'));
    outputPath = join(repoRoot, 'envelope.json');
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes appsettings envelope and ingests database + connects_to', () => {
    const envelope = runAppsettings(repoRoot, outputPath, 'src/Api/appsettings.json', {
      ConnectionStrings: {
        DefaultConnection: 'Host=postgres;Database=ods;Username=ods;Password=secret',
        AnalyticsConnection: 'Host=postgres;Database=analytics;Username=ods;Password=secret',
      },
      RabbitMQ: {
        Host: 'rabbit',
      },
    });

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

  it('classifies Provider / Rabbit / Redis under ConnectionStrings and copies Provider engine', () => {
    const envelope = runAppsettings(repoRoot, outputPath, 'src/Billing/appsettings.json', {
      ConnectionStrings: {
        Provider: 'MSSql',
        DefaultConnection: 'Data Source=db.internal;Initial Catalog=billing;user id=;password=secret',
        Rabbit: 'host=broker.internal:5672;username=guest;password=guest;virtualHost=/;timeout=60',
        Redis: 'cache.internal:6379,defaultDatabase=0',
      },
    });

    const bindings = envelope.model.sources[0]?.bindings ?? [];
    const byKey = Object.fromEntries(bindings.map((b) => [b.key, b]));

    expect(byKey.ConnectionStrings__Provider?.binding_type).toBe('other');
    expect(byKey.ConnectionStrings__Provider?.engine).toBe('mssql');
    expect(byKey.ConnectionStrings__DefaultConnection?.binding_type).toBe('database');
    expect(byKey.ConnectionStrings__DefaultConnection?.engine).toBe('mssql');
    expect(byKey.ConnectionStrings__Rabbit?.binding_type).toBe('broker');
    expect(byKey.ConnectionStrings__Rabbit?.engine).toBe('rabbitmq');
    expect(byKey.ConnectionStrings__Redis?.binding_type).toBe('cache');
    expect(byKey.ConnectionStrings__Redis?.engine).toBe('redis');

    const ingested = appsettingsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'appsettings',
      schema_version: '1',
      files_analyzed: ['src/Billing/appsettings.json'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.some((n) => n.name === 'Provider' || n.metadata?.key === 'ConnectionStrings__Provider')).toBe(
      false,
    );
    expect(ingested.nodes.filter((n) => n.kind === 'database')).toHaveLength(1);
    expect(ingested.nodes.find((n) => n.kind === 'database')?.metadata?.engine).toBe('mssql');
    expect(ingested.nodes.filter((n) => n.kind === 'broker')).toHaveLength(1);
    expect(ingested.nodes.filter((n) => n.kind === 'cache')).toHaveLength(1);
  });

  it('detects postgres engine from Host+Port=5432 without postgres token', () => {
    const envelope = runAppsettings(repoRoot, outputPath, 'src/Orders/appsettings.json', {
      ConnectionStrings: {
        DefaultConnection:
          'User ID=app;Password=secret;Host=db.internal;Port=5432;Database=orders;Pooling=true',
      },
    });

    const db = envelope.model.sources[0]?.bindings.find((b) => b.binding_type === 'database');
    expect(db?.engine).toBe('postgres');
  });

  it('coalesces RabbitSettings tails into one broker and links the service', () => {
    const envelope = runAppsettings(repoRoot, outputPath, 'src/Worker/appsettings.json', {
      RabbitSettings: {
        RabbitHost: 'broker.internal',
        RabbitPort: 5672,
        RabbitUserName: 'guest',
        RabbitPassword: 'guest',
        TimeoutInSeconds: 60,
      },
    });

    const bindings = envelope.model.sources[0]?.bindings ?? [];
    expect(bindings).toHaveLength(1);
    expect(bindings[0]?.key).toBe('RabbitSettings');
    expect(bindings[0]?.binding_type).toBe('broker');
    expect(bindings[0]?.target_hint).toBe('broker.internal:5672');
    expect(bindings.some((b) => /Timeout|Password|Port/i.test(b.key) && b.key.includes('__'))).toBe(false);

    const ingested = appsettingsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'appsettings',
      schema_version: '1',
      files_analyzed: ['src/Worker/appsettings.json'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes).toHaveLength(1);
    expect(ingested.nodes[0]?.kind).toBe('broker');
    expect(ingested.nodes[0]?.name).not.toMatch(/Timeout|Password|Port/i);
    expect(ingested.edges).toHaveLength(1);
    expect(ingested.edges[0]?.from).toBe(composeServiceNodeId('Worker'));
  });

  it('coalesces RedisSettings / ElasticSettings / S3-like settings without orphan leaves', () => {
    const envelope = runAppsettings(repoRoot, outputPath, 'src/Portal/appsettings.json', {
      RedisSettings: {
        RedisServer: 'cache.internal',
        RedisPort: '6379',
      },
      ElasticSettings: {
        HostName: 'http://search.internal',
        Port: 9200,
        IndexPrefix: 'app',
        FlushInterval: '00:00:05',
      },
      AmazonS3FileStorage: {
        AccessKey: 'key',
        SecretKey: 'secret',
        BucketName: 'uploads',
      },
    });

    const bindings = envelope.model.sources[0]?.bindings ?? [];
    expect(bindings.map((b) => b.binding_type).sort()).toEqual(['cache', 'search', 'storage']);
    expect(bindings.every((b) => !b.key.includes('__'))).toBe(true);

    const ingested = appsettingsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'appsettings',
      schema_version: '1',
      files_analyzed: ['src/Portal/appsettings.json'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.map((n) => n.kind).sort()).toEqual(['cache', 'search', 'storage']);
    expect(ingested.nodes.every((n) => !/__/u.test(n.name))).toBe(true);
  });

  it('dedups ConnectionStrings Rabbit with RabbitSettings when target matches', () => {
    const envelope = runAppsettings(repoRoot, outputPath, 'src/Api/appsettings.json', {
      ConnectionStrings: {
        Rabbit: 'host=broker.internal:5672;username=guest;password=guest;virtualHost=/',
      },
      RabbitSettings: {
        RabbitHost: 'broker.internal',
        RabbitPort: 5672,
        TimeoutInSeconds: 30,
      },
    });

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

    expect(ingested.nodes.filter((n) => n.kind === 'broker')).toHaveLength(1);
  });
});
