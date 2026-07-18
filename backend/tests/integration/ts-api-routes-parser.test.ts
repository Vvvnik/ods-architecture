import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { tsApiRoutesIngestAdapter } from '../../src/services/ingest/adapters/ts-api-routes.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('ts-api-routes parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-ts-api-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    mkdirSync(join(repoRoot, 'backend/src/api/routes'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'backend/src/index.ts'),
      `import Fastify from 'fastify';
const app = Fastify();
app.get('/api/v1/health', async () => ({ ok: true }));
`,
      'utf8',
    );
    writeFileSync(
      join(repoRoot, 'backend/src/api/routes/graph.ts'),
      `const prefix = '/api/v1/projects/:projectId/graph';
app.get(\`\${prefix}/view\`, async () => ({}));
`,
      'utf8',
    );

    runParserCli({
      parserId: 'ts-api-routes',
      entry: 'run.mjs',
      workingCopyRoot: repoRoot,
      files: ['backend/src/index.ts', 'backend/src/api/routes/graph.ts'],
      outputPath,
      install: false,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('extracts ods-arch-like paths and ingests http_endpoint', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      model: { routes: Array<{ method: string; path: string }> };
    };

    expect(envelope.parser_id).toBe('ts-api-routes');
    expect(envelope.model.routes.some((r) => r.path === '/api/v1/health')).toBe(true);
    expect(
      envelope.model.routes.some((r) => r.path === '/api/v1/projects/:projectId/graph/view'),
    ).toBe(true);

    const ingested = tsApiRoutesIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'ts-api-routes',
      schema_version: '1',
      files_analyzed: ['backend/src/index.ts', 'backend/src/api/routes/graph.ts'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.filter((n) => n.kind === 'http_endpoint').length).toBeGreaterThanOrEqual(
      1,
    );
    expect(ingested.nodes.every((n) => n.metadata?.source === 'code')).toBe(true);
  });
});
