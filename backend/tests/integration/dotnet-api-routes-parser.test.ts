import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { dotnetApiRoutesIngestAdapter } from '../../src/services/ingest/adapters/dotnet-api-routes.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('dotnet-api-routes parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-dotnet-api-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    mkdirSync(join(repoRoot, 'api/Controllers'), { recursive: true });
    writeFileSync(
      join(repoRoot, 'api/Controllers/HealthController.cs'),
      `using Microsoft.AspNetCore.Mvc;
namespace Demo.Api.Controllers;
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok();
}
`,
      'utf8',
    );
    writeFileSync(
      join(repoRoot, 'api/Program.cs'),
      `var app = WebApplication.CreateBuilder().Build();
app.MapGet("/minimal/ping", () => Results.Ok());
`,
      'utf8',
    );

    runParserCli({
      parserId: 'dotnet-api-routes',
      entry: 'run.sh',
      workingCopyRoot: repoRoot,
      files: ['api/Controllers/HealthController.cs', 'api/Program.cs'],
      outputPath,
      install: false,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('extracts controller + MapGet and ingests http_endpoint', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      model: { routes: Array<{ method: string; path: string; style: string }> };
    };

    expect(envelope.parser_id).toBe('dotnet-api-routes');
    expect(envelope.model.routes.some((r) => r.style === 'controller')).toBe(true);
    expect(envelope.model.routes.some((r) => r.style === 'minimal' && r.path === '/minimal/ping')).toBe(
      true,
    );

    const ingested = dotnetApiRoutesIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'dotnet-api-routes',
      schema_version: '1',
      files_analyzed: ['api/Controllers/HealthController.cs', 'api/Program.cs'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.filter((n) => n.kind === 'http_endpoint').length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
