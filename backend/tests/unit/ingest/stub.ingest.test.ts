import { describe, expect, it } from 'vitest';

import { stubIngestAdapter } from '../../../src/services/ingest/adapters/stub.ingest.js';
import type { IngestContext } from '../../../src/services/ingest/types.js';

const baseContext: IngestContext = {
  project_id: '00000000-0000-4000-8000-000000000001',
  analysis_run_id: '00000000-0000-4000-8000-000000000002',
  parser_id: 'stub',
  schema_version: '1',
  files_analyzed: ['Program.cs', 'Controllers/WeatherForecastController.cs'],
  incremental: false,
  affected_paths: ['Program.cs', 'Controllers/WeatherForecastController.cs'],
  deleted_paths: [],
};

describe('stubIngestAdapter', () => {
  it('creates one file node per analyzed path', () => {
    const { nodes, edges } = stubIngestAdapter.transform(
      { stub: true, file_count: 2 },
      baseContext,
    );

    expect(nodes).toHaveLength(2);
    expect(nodes.map((node) => node.path).sort()).toEqual([
      'Controllers/WeatherForecastController.cs',
      'Program.cs',
    ]);
    expect(nodes.every((node) => node.kind === 'file')).toBe(true);
    expect(nodes.every((node) => node.language === 'csharp')).toBe(true);
    expect(edges).toHaveLength(0);
  });
});
