import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { pythonApiRoutesIngestAdapter } from '../../src/services/ingest/adapters/python-api-routes.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/python-http-grpc-demo');

describe('python-api-routes parser CLI + ingest', () => {
  it('extracts FastAPI, Flask, Django (incl. include) and ingests endpoints', () => {
    const outputPath = '/tmp/ods-python-api-routes-envelope.json';
    runParserCli({
      parserId: 'python-api-routes',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: [
        'fastapi_app/main.py',
        'flask_app/app.py',
        'django_app/urls.py',
        'django_app/api_urls.py',
      ],
      outputPath,
      install: false,
    });

    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      model: {
        routes: Array<{ method: string; path: string; framework?: string; path_complete?: boolean }>;
      };
    };

    expect(envelope.parser_id).toBe('python-api-routes');
    const byFw = (fw: string) => envelope.model.routes.filter((r) => r.framework === fw);
    expect(byFw('fastapi').length).toBeGreaterThanOrEqual(1);
    expect(byFw('flask').length).toBeGreaterThanOrEqual(1);
    expect(byFw('django').length).toBeGreaterThanOrEqual(1);
    expect(
      envelope.model.routes.some(
        (r) => r.framework === 'django' && r.path.includes('/api/') && r.path_complete !== false,
      ),
    ).toBe(true);
    expect(envelope.model.routes.some((r) => r.path.includes('{') || r.path.includes('<'))).toBe(
      true,
    );

    const ingested = pythonApiRoutesIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'python-api-routes',
      schema_version: '1',
      files_analyzed: envelope.model.routes.map((r) => r.path),
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.filter((n) => n.kind === 'http_endpoint').length).toBeGreaterThanOrEqual(
      3,
    );
  });
});
