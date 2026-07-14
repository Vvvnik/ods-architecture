import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detectArtifacts } from '../../src/services/artifact-detector.js';
import { csharpIngestAdapter } from '../../src/services/ingest/adapters/csharp.ingest.js';
import { typescriptIngestAdapter } from '../../src/services/ingest/adapters/typescript.ingest.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';
import { runParserCli } from '../helpers/parser-cli.js';

const CODE_FIXTURE_ROOT = join(process.cwd(), '../docker/fixtures/repos/code-graph-depth-demo');

describe('system landscape code regression (SC-003)', () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), 'ods-code-regression-'));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  it('does not emit system artifacts or system-layer graph on code-only fixture', async () => {
    const paths = await listAllFilePaths(CODE_FIXTURE_ROOT, ['node_modules', 'dist', '.git']);
    const artifacts = await detectArtifacts(CODE_FIXTURE_ROOT, paths);
    const systemArtifactTypes = new Set(['compose', 'appsettings', 'openapi', 'dotnet-project', 'bus']);

    expect(artifacts.filter((entry) => systemArtifactTypes.has(entry.artifact_type))).toHaveLength(0);

    const csharpOutput = join(workDir, 'csharp.json');
    const tsOutput = join(workDir, 'typescript.json');

    runParserCli({
      parserId: 'csharp',
      entry: 'run.sh',
      workingCopyRoot: CODE_FIXTURE_ROOT,
      files: ['csharp/Service.cs', 'csharp/Repo.cs'],
      outputPath: csharpOutput,
      install: false,
    });
    runParserCli({
      parserId: 'typescript',
      workingCopyRoot: CODE_FIXTURE_ROOT,
      files: ['typescript/create.ts', 'typescript/save.ts'],
      outputPath: tsOutput,
    });

    const csharpEnvelope = JSON.parse(readFileSync(csharpOutput, 'utf8'));
    const tsEnvelope = JSON.parse(readFileSync(tsOutput, 'utf8'));

    const ctx = {
      project_id: 'p-code',
      analysis_run_id: 'r-code',
      schema_version: '2' as const,
      incremental: false,
      affected_paths: [] as string[],
      deleted_paths: [] as string[],
    };

    const csharpGraph = csharpIngestAdapter.transform(csharpEnvelope.model, {
      ...ctx,
      parser_id: 'csharp',
      files_analyzed: csharpEnvelope.files_analyzed,
    });
    const tsGraph = typescriptIngestAdapter.transform(tsEnvelope.model, {
      ...ctx,
      parser_id: 'typescript',
      files_analyzed: tsEnvelope.files_analyzed,
    });

    const allNodes = [...csharpGraph.nodes, ...tsGraph.nodes];
    const allEdges = [...csharpGraph.edges, ...tsGraph.edges];

    expect(allNodes.length).toBeGreaterThan(0);
    expect(allEdges.length).toBeGreaterThan(0);
    expect(allNodes.every((node) => node.metadata?.layer !== 'system')).toBe(true);
    expect(allEdges.every((edge) => edge.metadata?.layer !== 'system')).toBe(true);
  });
});
