import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LocaleProvider } from '../i18n/locale.js';
import { ElementProperties } from './ElementProperties.js';

describe('ElementProperties', () => {
  it('offers only the three writable element statuses', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <LocaleProvider>
          <ElementProperties
            projectId="p1"
            element={{
              id: 'e1',
              project_id: 'p1',
              path: 'src/app.ts',
              parent_path: 'src',
              type: 'file',
              status: 'auto_found',
              is_active: true,
            }}
          />
        </LocaleProvider>
      </QueryClientProvider>,
    );

    const select = screen.getByRole('combobox');
    expect([...select.querySelectorAll('option')].map((option) => option.value)).toEqual([
      'auto_found',
      'needed',
      'not_needed',
    ]);
  });
});
