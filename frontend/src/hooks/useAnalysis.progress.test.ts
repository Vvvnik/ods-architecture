import { describe, expect, it } from 'vitest';

import { formatAnalysisProgressHint } from '../i18n/ru.js';

describe('formatAnalysisProgressHint', () => {
  it('shows parser and N/M', () => {
    expect(
      formatAnalysisProgressHint({
        progress_phase: 'parsing',
        progress_active_parser_id: 'csharp',
        progress_parsers_completed: 1,
        progress_parsers_total: 4,
      }),
    ).toBe('Анализ: csharp (1/4)');
  });

  it('shows ingest phase', () => {
    expect(
      formatAnalysisProgressHint({
        progress_phase: 'ingest',
        progress_parsers_completed: 4,
        progress_parsers_total: 4,
      }),
    ).toBe('Построение графа…');
  });
});
