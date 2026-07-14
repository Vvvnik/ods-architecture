import { describe, expect, it } from 'vitest';

import { analysisRunSchema } from '../../src/api/schemas/analysis.schemas.js';

describe('analysis-run-progress schema', () => {
  it('accepts progress fields', () => {
    const parsed = analysisRunSchema.parse({
      id: '11111111-1111-1111-1111-111111111111',
      project_id: '22222222-2222-2222-2222-222222222222',
      status: 'running',
      started_at: new Date().toISOString(),
      incremental: false,
      progress_phase: 'parsing',
      progress_active_parser_id: 'csharp',
      progress_parsers_completed: 1,
      progress_parsers_total: 3,
      progress_updated_at: new Date().toISOString(),
    });
    expect(parsed.progress_phase).toBe('parsing');
    expect(parsed.progress_parsers_completed).toBe(1);
  });

  it('rejects detecting/sync phases', () => {
    expect(() =>
      analysisRunSchema.parse({
        id: '11111111-1111-1111-1111-111111111111',
        project_id: '22222222-2222-2222-2222-222222222222',
        status: 'running',
        started_at: new Date().toISOString(),
        incremental: false,
        progress_phase: 'detecting',
      }),
    ).toThrow();
  });
});
