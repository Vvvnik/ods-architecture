import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

function pythonAvailable(): boolean {
  try {
    execSync('python3 --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

const pythonOk = pythonAvailable();

describe.skipIf(!pythonOk)('python parser CLI', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-python-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    writeFileSync(
      join(repoRoot, 'app.py'),
      `import os

def main():
    return os.getcwd()
`,
    );

    const parserRoot = join(process.cwd(), '../parsers/python');
    execSync(`chmod +x "${join(parserRoot, 'run.sh')}"`);
    execSync(
      `"${join(parserRoot, 'run.sh')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000001 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000002 ' +
        `--files '["app.py"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe' },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes python envelope with symbols model v1', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      files_analyzed: string[];
      model: {
        symbols: Array<{
          name: string;
          kind: string;
          qualified_name?: string;
          refs?: Array<{ type: string; name: string }>;
        }>;
      };
    };

    expect(envelope.parser_id).toBe('python');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.files_analyzed).toEqual(['app.py']);
    expect(envelope.model.symbols.length).toBeGreaterThan(0);

    const mainSymbol = envelope.model.symbols.find(
      (symbol) => symbol.name === 'main' && symbol.kind === 'function',
    );
    expect(mainSymbol).toBeDefined();
    expect(mainSymbol?.qualified_name).toBe('app.main');

    const importRefs = envelope.model.symbols.flatMap((symbol) => symbol.refs ?? []);
    expect(importRefs.some((ref) => ref.type === 'imports' && ref.name === 'os')).toBe(true);
  });
});
