import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { tsHttpCallsIngestAdapter } from '../../src/services/ingest/adapters/ts-http-calls.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('ts-http-calls parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-ts-http-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    mkdirSync(join(repoRoot, 'frontend/src/api'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'frontend/src/api/client.ts'),
      `const API_BASE = '/api/v1';
export async function apiFetch(path, init) {
  return fetch(\`\${API_BASE}\${path}\`, init);
}
`,
      'utf8',
    );
    writeFileSync(
      join(repoRoot, 'frontend/src/api/projects.ts'),
      `import { apiFetch } from './client.js';
export function listProjects() {
  return apiFetch('/projects');
}
export function syncProject(id) {
  return apiFetch(\`/projects/\${id}/sync\`, { method: 'POST' });
}
`,
      'utf8',
    );

    runParserCli({
      parserId: 'ts-http-calls',
      entry: 'run.mjs',
      workingCopyRoot: repoRoot,
      files: ['frontend/src/api/client.ts', 'frontend/src/api/projects.ts'],
      outputPath,
      install: false,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('extracts /api/v1 calls and ingests http_calls edges', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      model: { calls: Array<{ method: string; path: string }> };
    };

    expect(envelope.parser_id).toBe('ts-http-calls');
    const paths = envelope.model.calls.map((c) => c.path).sort();
    expect(paths).toContain('/api/v1/projects');
    expect(paths).toContain('/api/v1/projects/:id/sync');
    expect(paths.every((p) => p.startsWith('/api/v1/'))).toBe(true);

    const ingested = tsHttpCallsIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'ts-http-calls',
      schema_version: '1',
      files_analyzed: ['frontend/src/api/client.ts', 'frontend/src/api/projects.ts'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes).toHaveLength(0);
    expect(ingested.edges.filter((e) => e.type === 'http_calls').length).toBeGreaterThanOrEqual(1);
    expect(
      ingested.edges.every(
        (e) => typeof e.to === 'string' && e.metadata?.http_path?.toString().startsWith('/api/v1'),
      ),
    ).toBe(true);
  });
});
