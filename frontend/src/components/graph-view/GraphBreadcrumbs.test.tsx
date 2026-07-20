import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { GraphBreadcrumbs } from './GraphBreadcrumbs.js';
import { getMessages } from '../../i18n/index.js';

const { GRAPH_VIEW_BREADCRUMB_SYSTEM, GRAPH_VIEW_TO_SYSTEM, GRAPH_VIEW_UP } =
  getMessages('en');

describe('GraphBreadcrumbs (T034)', () => {
  it('navigates via a crumb, up, and back to system', () => {
    const onNavigate = vi.fn();
    render(
      <GraphBreadcrumbs
        items={[
          { id: null, label: GRAPH_VIEW_BREADCRUMB_SYSTEM },
          { id: 'svc-1', label: 'Api' },
          { id: 'ep-1', label: 'GET /x' },
        ]}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Api' }));
    expect(onNavigate).toHaveBeenCalledWith('svc-1');

    fireEvent.click(screen.getByRole('button', { name: GRAPH_VIEW_UP }));
    expect(onNavigate).toHaveBeenCalledWith('svc-1');

    fireEvent.click(screen.getByRole('button', { name: GRAPH_VIEW_TO_SYSTEM }));
    expect(onNavigate).toHaveBeenCalledWith(null);
  });
});
