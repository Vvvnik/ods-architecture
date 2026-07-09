import { execSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('cpp parser CLI', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-cpp-repo-'));
    outputPath = join(repoRoot, 'envelope.json');
    mkdirSync(join(repoRoot, 'src'), { recursive: true });

    writeFileSync(
      join(repoRoot, 'src', 'main.cpp'),
      `#include <iostream>

int main() {
    std::cout << "hello";
    return 0;
}
`,
    );

    const parserRoot = join(process.cwd(), '../parsers/cpp');
    execSync(`chmod +x "${join(parserRoot, 'run.sh')}"`);
    execSync(
      `node "${join(parserRoot, 'run.mjs')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000001 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000002 ' +
        `--files '["src/main.cpp"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe' },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes cpp envelope with symbols model v1', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      files_analyzed: string[];
      model: {
        symbols: Array<{
          name: string;
          kind: string;
          refs?: Array<{ type: string; name: string; qualified_name?: string }>;
        }>;
      };
    };

    expect(envelope.parser_id).toBe('cpp');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.files_analyzed).toEqual(['src/main.cpp']);
    expect(envelope.model.symbols.length).toBeGreaterThan(0);

    const mainSymbol = envelope.model.symbols.find(
      (symbol) => symbol.name === 'main' && symbol.kind === 'function',
    );
    expect(mainSymbol).toBeDefined();

    const importRefs = envelope.model.symbols.flatMap((symbol) => symbol.refs ?? []);
    expect(
      importRefs.some(
        (ref) => ref.type === 'imports' && ref.name === 'iostream' && ref.qualified_name === 'std',
      ),
    ).toBe(true);
  });
});
