import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectArtifacts, pathsMatchingArtifact } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('detector api-routes (013)', () => {
  it('detects ts-api-routes when fastify is present', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-ts-api-'));
    await mkdir(join(root, 'backend/src'), { recursive: true });
    await writeFile(
      join(root, 'backend/src/index.ts'),
      `import Fastify from 'fastify';\nconst app = Fastify();\napp.get('/api/v1/health', async () => ({}));\n`,
      'utf8',
    );
    await writeFile(join(root, 'backend/src/util.ts'), 'export const x = 1;\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'ts-api-routes');

    expect(entry?.parser_id).toBe('ts-api-routes');
    expect(entry?.file_count).toBe(1);
    expect(entry?.sample_paths).toEqual(['backend/src/index.ts']);
  });

  it('does not detect ts-api-routes without fastify', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-ts-api-neg-'));
    await writeFile(join(root, 'index.ts'), `export function get() { return 1; }\n`, 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);

    expect(artifacts.find((a) => a.artifact_type === 'ts-api-routes')).toBeUndefined();
  });

  it('detects dotnet-api-routes for HttpGet and MapGet', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-dotnet-api-'));
    await writeFile(
      join(root, 'HealthController.cs'),
      '[HttpGet]\npublic IActionResult Get() => Ok();\n',
      'utf8',
    );
    await writeFile(join(root, 'Program.cs'), 'app.MapGet("/ping", () => Results.Ok());\n', 'utf8');
    await writeFile(join(root, 'Util.cs'), 'public static class Util {}\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'dotnet-api-routes');

    expect(entry?.file_count).toBe(2);
  });

  it('change-set pathsMatchingArtifact uses path suffix (over-include ok)', () => {
    const paths = ['backend/src/a.ts', 'api/Program.cs', 'readme.md'];
    expect(pathsMatchingArtifact(paths, 'ts-api-routes')).toEqual(['backend/src/a.ts']);
    expect(pathsMatchingArtifact(paths, 'dotnet-api-routes')).toEqual(['api/Program.cs']);
  });
});
