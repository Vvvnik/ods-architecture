import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { csharpIngestAdapter } from '../../../src/services/ingest/adapters/csharp.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const fixturePath = join(process.cwd(), 'tests/fixtures/ingest/csharp-model-v1.json');

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'csharp',
  schema_version: '1',
  files_analyzed: ['WeatherForecast.cs', 'Controllers/WeatherForecastController.cs'],
  incremental: false,
  affected_paths: ['WeatherForecast.cs', 'Controllers/WeatherForecastController.cs'],
  deleted_paths: [],
};

describe('csharpIngestAdapter', () => {
  it('transforms fixture model into canonical nodes and edges', async () => {
    const raw = await readFile(fixturePath, 'utf8');
    const model = JSON.parse(raw);

    const { nodes, edges } = csharpIngestAdapter.transform(model, baseContext);

    expect(nodes).toHaveLength(3);
    expect(nodes.map((node) => node.name).sort()).toEqual([
      'WeatherForecast',
      'WeatherForecastController',
      'WebApplication1',
    ]);
    expect(nodes.every((node) => node.parser_id === 'csharp')).toBe(true);
    expect(nodes.every((node) => node.language === 'csharp')).toBe(true);
    expect(nodes.every((node) => node.id?.startsWith('csharp:'))).toBe(true);

    const weatherForecast = nodes.find((node) => node.name === 'WeatherForecast');
    expect(weatherForecast?.parent_id).toBeTruthy();

    expect(edges).toHaveLength(2);
    expect(edges.map((edge) => edge.type).sort()).toEqual(['imports', 'inherits']);
    expect(edges.every((edge) => edge.parser_id === 'csharp')).toBe(true);
    expect(edges.every((edge) => edge.metadata?.layer === 'code')).toBe(true);
    expect(nodes.every((node) => node.metadata?.layer === 'code')).toBe(true);
  });
});
