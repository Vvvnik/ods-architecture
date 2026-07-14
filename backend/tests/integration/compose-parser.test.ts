import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { composeIngestAdapter } from '../../src/services/ingest/adapters/compose.ingest.js';

describe('compose parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-compose-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    writeFileSync(
      join(repoRoot, 'docker-compose.yml'),
      `services:
  api:
    image: api:latest
    depends_on:
      - worker
  worker:
    image: worker:latest
`,
      'utf8',
    );

    const parserRoot = join(process.cwd(), '../parsers/compose');
    execSync('npm install --no-fund --no-audit', { cwd: parserRoot, stdio: 'pipe' });
    execSync(
      `node "${join(parserRoot, 'run.mjs')}" ` +
        '--project-id 00000000-0000-4000-8000-000000000001 ' +
        `--working-copy-root "${repoRoot}" ` +
        '--analysis-run-id 00000000-0000-4000-8000-000000000002 ' +
        `--files '["docker-compose.yml"]' ` +
        `--output "${outputPath}"`,
      { stdio: 'pipe' },
    );
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes compose envelope and ingests depends_on edges', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      model: { services: Array<{ name: string }> };
    };

    expect(envelope.parser_id).toBe('compose');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.model.services.map((service) => service.name)).toEqual(['api', 'worker']);

    const ingested = composeIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      schema_version: '1',
      files_analyzed: ['docker-compose.yml'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.edges.some((edge) => edge.type === 'depends_on')).toBe(true);
  });
});
