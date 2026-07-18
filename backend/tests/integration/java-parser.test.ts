import { execSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { javaIngestAdapter } from '../../src/services/ingest/adapters/java.ingest.js';
import type { IngestContext } from '../../src/services/ingest/types.js';

const parserRoot = join(process.cwd(), '../parsers/java');
const jarPath = join(parserRoot, 'target/ods-java-parser.jar');
const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/java-symbols-demo');

function javaRuntimeOk(): boolean {
  try {
    execSync('java -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function ensureJar(): boolean {
  if (existsSync(jarPath)) {
    return true;
  }
  try {
    execSync('mvn -q -DskipTests package', { cwd: parserRoot, stdio: 'pipe' });
    return existsSync(jarPath);
  } catch {
    return false;
  }
}

const toolOk = javaRuntimeOk() && ensureJar();

describe.skipIf(!toolOk)('java parser CLI + ingest (018)', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeAll(() => {
    execSync(`chmod +x "${join(parserRoot, 'run.sh')}"`);
  });

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-java-repo-'));
    outputPath = join(repoRoot, 'envelope.json');
    const main = join(repoRoot, 'demo/src/main/java/com/example/App.java');
    mkdirSync(join(main, '..'), { recursive: true });
    writeFileSync(
      main,
      `package com.example;
public class App {}
`,
    );
    const testFile = join(repoRoot, 'demo/src/test/java/com/example/AppTest.java');
    mkdirSync(join(testFile, '..'), { recursive: true });
    writeFileSync(testFile, 'package com.example; public class AppTest {}');

    execSync(
      `"${join(parserRoot, 'run.sh')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000001 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000002 ' +
        `--files '["demo/src/main/java/com/example/App.java","demo/src/test/java/com/example/AppTest.java"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe' },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes envelope with module, namespace, class; skips test', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      files_analyzed: string[];
      model: { symbols: Array<{ name: string; kind: string; qualified_name?: string }> };
    };

    expect(envelope.parser_id).toBe('java');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.files_analyzed).toEqual(['demo/src/main/java/com/example/App.java']);
    expect(envelope.model.symbols.some((s) => s.kind === 'module')).toBe(true);
    expect(
      envelope.model.symbols.some(
        (s) => s.kind === 'namespace' && s.qualified_name === 'com.example',
      ),
    ).toBe(true);
    expect(envelope.model.symbols.some((s) => s.kind === 'class' && s.name === 'App')).toBe(true);
    expect(envelope.model.symbols.some((s) => s.name === 'AppTest')).toBe(false);
  });

  it('fixture java-symbols-demo → ingest nodes with package parent', () => {
    const files = [
      'src/main/java/com/example/demo/Greeter.java',
      'src/main/java/com/example/demo/Clock.java',
      'src/main/java/com/example/demo/NestedHolder.java',
      'src/test/java/com/example/demo/GreeterTest.java',
    ];
    const out = join(repoRoot, 'fixture-envelope.json');
    execSync(
      `"${join(parserRoot, 'run.sh')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000001 ' +
        `--working-copy-root "${fixtureRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000002 ' +
        `--files '${JSON.stringify(files)}' ` +
        `--output "${out}"`,
      { stdio: 'pipe' },
    );

    const envelope = JSON.parse(readFileSync(out, 'utf8')) as {
      model: { symbols: Array<{ name: string; kind: string }> };
      files_analyzed: string[];
    };

    expect(envelope.files_analyzed).not.toContain(
      'src/test/java/com/example/demo/GreeterTest.java',
    );
    expect(envelope.model.symbols.some((s) => s.name === 'Inner')).toBe(false);

    const ctx: IngestContext = {
      project_id: '00000000-0000-4000-8000-000000000001',
      analysis_run_id: '00000000-0000-4000-8000-000000000002',
      parser_id: 'java',
      schema_version: '1',
      files_analyzed: envelope.files_analyzed,
      incremental: false,
      affected_paths: envelope.files_analyzed,
      deleted_paths: [],
    };
    const { nodes } = javaIngestAdapter.transform(envelope.model, ctx);
    expect(nodes.every((n) => n.language === 'java' && n.parser_id === 'java')).toBe(true);
    const ns = nodes.find((n) => n.kind === 'namespace');
    const greeter = nodes.find((n) => n.kind === 'class' && n.name === 'Greeter');
    expect(ns?.qualified_name).toBe('com.example.demo');
    expect(greeter?.parent_id).toBe(ns?.id);
    expect(nodes.some((n) => n.name === 'Clock')).toBe(true);
    expect(nodes.some((n) => n.name === 'NestedHolder')).toBe(true);
  });
});
