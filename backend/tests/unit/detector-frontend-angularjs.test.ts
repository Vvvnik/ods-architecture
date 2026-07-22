import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectArtifacts, pathsMatchingArtifact } from '../../src/services/artifact-detector.js';
import { listAllFilePaths } from '../../src/services/language-detector.service.js';

describe('detector frontend-angularjs (021)', () => {
  it('detects AngularJS under api-gateway static/scripts', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-ajs-'));
    const scripts = join(
      root,
      'spring-petclinic-api-gateway/src/main/resources/static/scripts',
    );
    await mkdir(scripts, { recursive: true });
    await writeFile(
      join(scripts, 'app.js'),
      `angular.module('petClinicApp', ['ui.router']);
$stateProvider.state('welcome', { url: '/welcome' });
`,
      'utf8',
    );
    await writeFile(join(scripts, 'owner.js'), `$http.get('api/x');\n`, 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    const entry = artifacts.find((a) => a.artifact_type === 'frontend-angularjs');

    expect(entry?.parser_id).toBe('angularjs-ui');
    expect(entry?.file_count).toBeGreaterThanOrEqual(1);
    expect(entry?.sample_paths.some((p) => p.endsWith('app.js'))).toBe(true);
  });

  it('does not detect React-only tree as AngularJS', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-ajs-neg-'));
    await mkdir(join(root, 'frontend/src'), { recursive: true });
    await writeFile(
      join(root, 'frontend/package.json'),
      JSON.stringify({
        name: 'demo',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      }),
      'utf8',
    );
    await writeFile(join(root, 'frontend/src/main.tsx'), 'import React from "react";\n', 'utf8');

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);

    expect(artifacts.find((a) => a.artifact_type === 'frontend-angularjs')).toBeUndefined();
    expect(artifacts.find((a) => a.artifact_type === 'frontend-ui')?.parser_id).toBe('react-ui');
  });

  it('does not treat Angular 2+ hints as AngularJS DoD', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-ajs-ng2-'));
    const scripts = join(root, 'apps/web/src');
    await mkdir(scripts, { recursive: true });
    await writeFile(
      join(scripts, 'main.ts'),
      `import { bootstrapApplication } from '@angular/core';
export const app = { standalone: true };
`,
      'utf8',
    );

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    expect(artifacts.find((a) => a.artifact_type === 'frontend-angularjs')).toBeUndefined();
  });

  it('dual-stack emits both frontend-ui and frontend-angularjs', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-frontend-dual-'));
    await mkdir(join(root, 'frontend/src'), { recursive: true });
    await writeFile(
      join(root, 'frontend/package.json'),
      JSON.stringify({
        name: 'react-app',
        dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
      }),
      'utf8',
    );
    await writeFile(join(root, 'frontend/src/main.tsx'), 'import React from "react";\n', 'utf8');

    const scripts = join(
      root,
      'spring-petclinic-api-gateway/src/main/resources/static/scripts',
    );
    await mkdir(scripts, { recursive: true });
    await writeFile(
      join(scripts, 'app.js'),
      `angular.module('petClinicApp', ['ui.router']);\n`,
      'utf8',
    );

    const paths = await listAllFilePaths(root, ['node_modules', 'dist']);
    const artifacts = await detectArtifacts(root, paths);
    expect(artifacts.find((a) => a.artifact_type === 'frontend-ui')?.parser_id).toBe('react-ui');
    expect(artifacts.find((a) => a.artifact_type === 'frontend-angularjs')?.parser_id).toBe(
      'angularjs-ui',
    );
  });

  it('pathsMatchingArtifact selects gateway static scripts', () => {
    const paths = [
      'spring-petclinic-api-gateway/src/main/resources/static/scripts/app.js',
      'frontend/src/main.tsx',
      'readme.md',
    ];
    expect(pathsMatchingArtifact(paths, 'frontend-angularjs')).toEqual([
      'spring-petclinic-api-gateway/src/main/resources/static/scripts/app.js',
    ]);
  });
});
