import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { dotnetProjectIngestAdapter } from '../../../src/services/ingest/adapters/dotnet-project.ingest.js';

describe('dotnet-project.ingest', () => {
  it('maps dotnet_project nodes and project_reference edges with system layer', async () => {
    const model = JSON.parse(
      await readFile(join(process.cwd(), 'tests/fixtures/ingest/dotnet-project-model-v1.json'), 'utf8'),
    );

    const result = dotnetProjectIngestAdapter.transform(model, {
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'dotnet-project',
      schema_version: '1',
      files_analyzed: ['src/Api/Api.csproj', 'src/Worker/Worker.csproj'],
      incremental: false,
      affected_paths: [],
      deleted_paths: [],
    });

    expect(result.nodes.filter((node) => node.kind === 'dotnet_project')).toHaveLength(3);
    expect(result.edges.filter((edge) => edge.type === 'project_reference')).toHaveLength(2);
    expect(result.nodes.every((node) => node.metadata?.layer === 'system')).toBe(true);
  });
});
