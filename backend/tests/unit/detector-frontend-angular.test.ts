import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectArtifacts, pathsMatchingArtifact } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('detector frontend-angular (angular-ui)', () => {
  it('detects Angular SPA root with @angular/core', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-angular-'));
    await mkdir(join(root, 'client/src/app'), { recursive: true });
    await writeFile(
      join(root, 'client/package.json'),
      JSON.stringify({
        name: 'demo-angular-client',
        dependencies: { '@angular/core': '~13.0.0', '@angular/router': '~13.0.0' },
      }),
      'utf8',
    );
    await writeFile(
      join(root, 'client/angular.json'),
      JSON.stringify({ version: 1, projects: { app: { projectType: 'application' } } }),
      'utf8',
    );
    await writeFile(join(root, 'client/src/main.ts'), 'import "./app/app.module";\n', 'utf8');
    await writeFile(
      join(root, 'client/src/app/app-routing.module.ts'),
      'export const routes = [];\n',
      'utf8',
    );

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'frontend-angular');

    expect(entry?.parser_id).toBe('angular-ui');
    expect(entry?.file_count).toBeGreaterThanOrEqual(2);
    expect(entry?.sample_paths.some((p) => p.endsWith('package.json'))).toBe(true);
  });

  it('pathsMatchingArtifact prefers package.json and routing modules', () => {
    const paths = [
      'client/package.json',
      'client/src/app/app-routing.module.ts',
      'client/src/app/foo.component.ts',
      'backend/Program.cs',
    ];
    expect(pathsMatchingArtifact(paths, 'frontend-angular')).toEqual([
      'client/package.json',
      'client/src/app/app-routing.module.ts',
    ]);
  });
});
