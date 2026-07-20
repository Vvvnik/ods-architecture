import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { routerFuture } from '../app/router-future.js';
import type { GraphViewSlice } from '../api/graph-types.js';
import { getMessages } from '../i18n/index.js';

const { GRAPH_VIEW_ENTER } = getMessages('en');

vi.mock('../api/graph.js', () => ({
  getGraphView: vi.fn(),
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
  GraphCanvas: ({
    viewNodes,
    onSelectNode,
    onEnterNode,
  }: {
    viewNodes: Array<{ id: string; name: string }>;
    onSelectNode: (id: string | null) => void;
    onEnterNode: (id: string) => void;
  }) => (
    <div>
      {viewNodes.map((n) => (
        <button
          key={n.id}
          type="button"
          data-testid={`node-${n.id}`}
          onClick={() => onSelectNode(n.id)}
          onDoubleClick={() => onEnterNode(n.id)}
        >
          {n.name}
        </button>
      ))}
    </div>
  ),
}));

import { getGraphView } from '../api/graph.js';
import { GraphViewPage } from './GraphViewPage.js';

const getGraphViewMock = vi.mocked(getGraphView);

function systemSlice(overrides: Partial<GraphViewSlice> = {}): GraphViewSlice {
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

describe('GraphViewPage focus (T021)', () => {
  beforeEach(() => {
    getGraphViewMock.mockReset();
  });

  it('click selects without changing focus query; enter updates focus', async () => {
    getGraphViewMock.mockImplementation(async (_pid, params) => {
      if (params?.focus === 's1') {
        return systemSlice({
          focus_id: 's1',
          focus_kind: 'service',
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
              role: 'focus',
              stub: false,
            },
            {
              id: 'db1',
              project_id: 'p1',
              analysis_run_id: 'r1',
              parser_id: 'system',
              kind: 'database',
              name: 'pg',
              language: 'system',
              path: '/db',
              role: 'external',
              stub: true,
            },
          ],
        });
      }
      return systemSlice();
    });

    render(
      <MemoryRouter future={routerFuture} initialEntries={['/projects/p1/graph-view']}>
        <Routes>
          <Route path="/projects/:projectId/graph-view" element={<GraphViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('node-s1')).toBeTruthy());
    fireEvent.click(screen.getByTestId('node-s1'));
    await waitFor(() => expect(screen.getByRole('button', { name: GRAPH_VIEW_ENTER })).toBeTruthy());
    expect(getGraphViewMock).toHaveBeenCalledWith('p1', expect.objectContaining({ focus: undefined }));

    fireEvent.click(screen.getByRole('button', { name: GRAPH_VIEW_ENTER }));
    await waitFor(() =>
      expect(getGraphViewMock).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ focus: 's1' }),
      ),
    );
    await waitFor(() => expect(screen.getByTestId('node-db1')).toBeTruthy());
  });
});
