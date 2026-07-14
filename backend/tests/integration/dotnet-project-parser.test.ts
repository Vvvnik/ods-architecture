import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { dotnetProjectIngestAdapter } from '../../src/services/ingest/adapters/dotnet-project.ingest.js';
import { runParserCli } from '../helpers/parser-cli.js';

describe('dotnet-project parser CLI + ingest', () => {
  let repoRoot: string;
  let outputPath: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ods-dotnet-project-repo-'));
    outputPath = join(repoRoot, 'envelope.json');

    mkdirSync(join(repoRoot, 'src/Api'), { recursive: true });
    mkdirSync(join(repoRoot, 'src/Contracts'), { recursive: true });

    writeFileSync(
      join(repoRoot, 'src/Contracts/Contracts.csproj'),
      `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>
</Project>`,
      'utf8',
    );

    writeFileSync(
      join(repoRoot, 'src/Api/Api.csproj'),
      `<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>
  <ItemGroup>
    <ProjectReference Include="..\\Contracts\\Contracts.csproj" />
  </ItemGroup>
</Project>`,
      'utf8',
    );

    runParserCli({
      parserId: 'dotnet-project',
      workingCopyRoot: repoRoot,
      files: ['src/Api/Api.csproj', 'src/Contracts/Contracts.csproj'],
      outputPath,
      install: false,
    });
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('writes dotnet-project envelope and ingests project_reference edges', () => {
    const envelope = JSON.parse(readFileSync(outputPath, 'utf8')) as {
      parser_id: string;
      schema_version: string;
      model: { projects: Array<{ name: string; references: Array<{ name: string }> }> };
    };

    expect(envelope.parser_id).toBe('dotnet-project');
    expect(envelope.schema_version).toBe('1');
    expect(envelope.model.projects).toHaveLength(2);

    const ingested = dotnetProjectIngestAdapter.transform(envelope.model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'dotnet-project',
      schema_version: '1',
      files_analyzed: ['src/Api/Api.csproj', 'src/Contracts/Contracts.csproj'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(ingested.nodes.some((node) => node.kind === 'dotnet_project')).toBe(true);
    expect(ingested.edges.some((edge) => edge.type === 'project_reference')).toBe(true);
  });
});
