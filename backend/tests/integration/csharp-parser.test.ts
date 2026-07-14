import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function dotnetAvailable(): boolean {
  try {
    execSync('dotnet --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const dotnetOk = dotnetAvailable();

describe.skipIf(!dotnetOk)('csharp parser CLI', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-csharp-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    writeFileSync(
      join(repoRoot, 'Program.cs'),
      `using System;

namespace Sample;

public class Greeter
{
    public string Greet(string name) => $"Hello, {name}";
}
`,
    );

    const parserRoot = join(process.cwd(), '../parsers/csharp');
    execSync(`chmod +x "${join(parserRoot, 'run.sh')}"`);
    execSync(`dotnet build -c Release`, {
      cwd: join(parserRoot, 'Ods.CSharpParser'),
      stdio: 'pipe',
    });

    execSync(
      `"${join(parserRoot, 'run.sh')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000001 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000002 ' +
        `--files '["Program.cs"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe', env: { ...process.env, DOTNET_ROLL_FORWARD: 'LatestMajor' } },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes csharp envelope with symbols model v2', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      files_analyzed: string[];
      model: { symbols: Array<{ name: string; kind: string }> };
    };

    expect(envelope.parser_id).toBe('csharp');
    expect(envelope.schema_version).toBe('2');
    expect(envelope.files_analyzed).toEqual(['Program.cs']);
    expect(envelope.model.symbols.length).toBeGreaterThan(0);
    expect(envelope.model.symbols.some((symbol) => symbol.name === 'Greeter' && symbol.kind === 'class')).toBe(
      true,
    );
  });
});
