import { execSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function dotnetAvailable(): boolean {
  try {
    execSync('dotnet --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

describe.skipIf(!dotnetAvailable())('csharp ambiguous calls (SC-005)', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-csharp-amb-'));
    outputPath = join(repoRoot, 'envelope.json');
    cpSync(join(process.cwd(), 'tests/fixtures/parsers/csharp-ambiguous'), repoRoot, {
      recursive: true,
    });
    const parserRoot = join(process.cwd(), '../parsers/csharp');
    execSync(`dotnet build -c Release`, {
      cwd: join(parserRoot, 'Ods.CSharpParser'),
      stdio: 'pipe',
    });
    execSync(
      `"${join(parserRoot, 'run.sh')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000061 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000062 ' +
        `--files '["Overloads.cs"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe', env: { ...process.env, DOTNET_ROLL_FORWARD: 'LatestMajor' } },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('does not emit calls for ambiguous Run() overload', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      schema_version: string;
      model: { usages?: Array<{ type: string; from: string; to: string }> };
    };
    expect(envelope.schema_version).toBe('2');
    const callUsages = (envelope.model.usages ?? []).filter((u) => u.type === 'calls');
    expect(callUsages).toHaveLength(0);
  });
});
