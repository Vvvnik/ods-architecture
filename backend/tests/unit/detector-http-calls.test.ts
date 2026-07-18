import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectArtifacts, pathsMatchingArtifact } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('detector http-calls (014)', () => {
  it('detects ts-http-calls when apiFetch / API_BASE present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-ts-http-'));
    await mkdir(join(root, 'frontend/src/api'), { recursive: true });
    await writeFile(
      join(root, 'frontend/src/api/client.ts'),
      `const API_BASE = '/api/v1';\nexport async function apiFetch(path: string) {\n  return fetch(\`\${API_BASE}\${path}\`);\n}\n`,
      'utf8',
    );
    await writeFile(join(root, 'frontend/src/api/util.ts'), 'export const x = 1;\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'ts-http-calls');

    expect(entry?.parser_id).toBe('ts-http-calls');
    expect(entry?.file_count).toBe(1);
    expect(entry?.sample_paths).toEqual(['frontend/src/api/client.ts']);
  });

  it('does not detect ts-http-calls without client hints', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-ts-http-neg-'));
    await writeFile(join(root, 'index.ts'), `export function get() { return 1; }\n`, 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);

    expect(artifacts.find((a) => a.artifact_type === 'ts-http-calls')).toBeUndefined();
  });

  it('change-set pathsMatchingArtifact uses path suffix', () => {
    const paths = ['frontend/src/a.ts', 'readme.md'];
    expect(pathsMatchingArtifact(paths, 'ts-http-calls')).toEqual(['frontend/src/a.ts']);
  });
});
