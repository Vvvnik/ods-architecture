import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectArtifacts, pathsMatchingArtifact } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('detector frontend-ui (020)', () => {
  it('detects React/Vite SPA root with react dependency', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-ui-'));
    await mkdir(join(root, 'frontend/src/app'), { recursive: true });
    await writeFile(
      join(root, 'frontend/package.json'),
      JSON.stringify({
        name: 'demo-frontend',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      }),
      'utf8',
    );
    await writeFile(join(root, 'frontend/src/main.tsx'), 'import React from "react";\n', 'utf8');
    await writeFile(
      join(root, 'frontend/src/app/router.tsx'),
      'export const router = [];\n',
      'utf8',
    );
    await writeFile(join(root, 'frontend/src/styles.css'), 'body {}\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'frontend-ui');

    expect(entry?.parser_id).toBe('react-ui');
    expect(entry?.file_count).toBeGreaterThanOrEqual(3);
    expect(entry?.sample_paths.some((p) => p.endsWith('package.json'))).toBe(true);
    expect(entry?.frontend_languages?.some((lang) => lang.language === 'typescript')).toBe(true);
  });

  it('does not detect backend-only package without react', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-ui-neg-'));
    await mkdir(join(root, 'backend/src'), { recursive: true });
    await writeFile(
      join(root, 'backend/package.json'),
      JSON.stringify({
        name: 'demo-backend',
        dependencies: { fastify: '^5.0.0' },
      }),
      'utf8',
    );
    await writeFile(join(root, 'backend/src/index.ts'), 'export const x = 1;\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);

    expect(artifacts.find((a) => a.artifact_type === 'frontend-ui')).toBeUndefined();
  });

  it('pathsMatchingArtifact matches frontend and package.json paths', () => {
    const paths = [
      'frontend/src/main.tsx',
      'backend/src/index.ts',
      'frontend/package.json',
      'readme.md',
    ];
    expect(pathsMatchingArtifact(paths, 'frontend-ui')).toEqual([
      'frontend/src/main.tsx',
      'frontend/package.json',
    ]);
  });

  it('detects React SPA when package.json is at working-copy root', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-ui-root-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'spa-root',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      }),
      'utf8',
    );
    await writeFile(join(root, 'src/main.tsx'), 'import React from "react";\n', 'utf8');
    await writeFile(join(root, 'src/App.tsx'), 'export function App() { return null; }\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'frontend-ui');

    expect(entry?.parser_id).toBe('react-ui');
    expect(entry?.file_count).toBeGreaterThanOrEqual(2);
    expect(entry?.frontend_languages?.some((lang) => lang.language === 'typescript')).toBe(true);
  });
});
