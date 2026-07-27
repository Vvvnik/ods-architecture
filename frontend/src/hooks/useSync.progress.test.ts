import { describe, expect, it } from 'vitest';

import { formatSyncProgressHint, setCurrentLocale } from '../i18n/index.js';

describe('formatSyncProgressHint', () => {
  it('shows scan phase with path count', () => {
    setCurrentLocale('en');
    expect(
      formatSyncProgressHint({
        sync_phase: 'scan',
        sync_files_done: 1240,
        sync_files_total: null,
      }),
    ).toBe('Sync: indexing files · 1240 paths');
  });

  it('falls back to generic syncing label', () => {
    setCurrentLocale('en');
    expect(formatSyncProgressHint({})).toBe('Syncing…');
  });
});
