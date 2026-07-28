import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { routerFuture } from '../app/router-future.js';
import type { GraphViewSlice } from '../api/graph-types.js';
import { getMessages } from '../i18n/index.js';

const { GRAPH_MENU_ANALYSIS, GRAPH_VIEW_EMPTY_SYSTEM } = getMessages('en');

vi.mock('../api/graph.js', () => ({
  getGraphView: vi.fn(),
  getGraphUiOverview: vi.fn().mockResolvedValue({
    project_id: 'p1',
    analysis_run_id: 'r1',
    nodes: [],
    edges: [],
  }),
}));

vi.mock('../context/SessionContext.js', () => ({
  useSession: () => ({
    activeProjectId: 'p1',
    setActiveProjectId: vi.fn(),
  }),
}));

vi.mock('../hooks/useSync.js', () => ({
  useSync: () => ({
    project: { id: 'p1', name: 'Demo' },
    isRunning: false,
  }),
}));

vi.mock('../components/graph-view/GraphCanvas.js', () => ({
  GraphCanvas: () => <div data-testid="canvas" />,
}));

import { renderWithQuery } from './graph-view-test-utils.js';
import { getGraphView } from '../api/graph.js';
import { GraphViewPage } from './GraphViewPage.js';

const getGraphViewMock = vi.mocked(getGraphView);

function baseSlice(overrides: Partial<GraphViewSlice> = {}): GraphViewSlice {
  return {
    project_id: 'p1',
    analysis_run_id: 'r1',
    focus_id: null,
    focus_kind: null,
    layer: 'system',
    nodes: [
      {
        id: 's1',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'system',
        kind: 'service',
        name: 'Api',
        language: 'system',
        path: '/src/Api',
        role: 'inside',
        stub: false,
      },
    ],
    edges: [],
    truncated: false,
    limits: { max_nodes: 200, max_edges: 500 },
    counts: { nodes: 1, edges: 0 },
    resolve_status: 'none',
    empty_reason: 'none',
    affiliation: null,
    ...overrides,
  };
}

describe('GraphViewPage empty/truncate (T028)', () => {
  beforeEach(() => {
    getGraphViewMock.mockReset();
  });

  it('shows empty system message with link to analysis', async () => {
    getGraphViewMock.mockResolvedValue(
      baseSlice({
        nodes: [],
        empty_reason: 'no_system_participants',
        counts: { nodes: 0, edges: 0 },
      }),
    );

    renderWithQuery(
      <MemoryRouter future={routerFuture} initialEntries={['/projects/p1/graph-view']}>
        <Routes>
          <Route path="/projects/:projectId/graph-view" element={<GraphViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByText(GRAPH_VIEW_EMPTY_SYSTEM)).toBeTruthy());
    expect(screen.getByRole('link', { name: GRAPH_MENU_ANALYSIS }).getAttribute('href')).toBe(
      '/projects/p1/graph',
    );
  });

  it('keeps canvas visible when truncated', async () => {
    getGraphViewMock.mockResolvedValue(baseSlice({ truncated: true }));

    renderWithQuery(
      <MemoryRouter future={routerFuture} initialEntries={['/projects/p1/graph-view']}>
        <Routes>
          <Route path="/projects/:projectId/graph-view" element={<GraphViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('canvas')).toBeTruthy());
  });
});
