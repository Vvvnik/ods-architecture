import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { routerFuture } from '../app/router-future.js';
import type { GraphViewSlice } from '../api/graph-types.js';
import { getMessages } from '../i18n/index.js';

const { GRAPH_VIEW_ENTER_CODE } = getMessages('en');

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

import { renderWithQuery } from './graph-view-test-utils.js';
import { getGraphView } from '../api/graph.js';
import { GraphViewPage } from './GraphViewPage.js';

const getGraphViewMock = vi.mocked(getGraphView);

function slice(overrides: Partial<GraphViewSlice> = {}): GraphViewSlice {
  return {
    project_id: 'p1',
    analysis_run_id: 'r1',
    focus_id: 's1',
    focus_kind: 'service',
    layer: 'system',
    nodes: [
      {
        id: 's1',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'compose',
        kind: 'service',
        name: 'backend',
        language: 'system',
        path: 'docker/docker-compose.dev.yml',
        role: 'focus',
        stub: false,
      },
    ],
    edges: [],
    truncated: false,
    limits: { max_nodes: 200, max_edges: 500 },
    counts: { nodes: 1, edges: 0 },
    resolve_status: 'exact',
    empty_reason: 'none',
    affiliation: null,
    ...overrides,
  };
}

describe('GraphViewPage code entry (T013)', () => {
  beforeEach(() => {
    getGraphViewMock.mockReset();
  });

  it('shows the code action on a system service and sets layer=code', async () => {
    getGraphViewMock.mockImplementation(async (_pid, params) => {
      if (params?.layer === 'code') {
        return slice({
          layer: 'code',
          empty_reason: 'none',
          nodes: [
            {
              id: 's1',
              project_id: 'p1',
              analysis_run_id: 'r1',
              parser_id: 'compose',
              kind: 'service',
              name: 'backend',
              language: 'system',
              path: 'docker/docker-compose.dev.yml',
              role: 'focus',
              stub: false,
            },
            {
              id: 'm1',
              project_id: 'p1',
              analysis_run_id: 'r1',
              parser_id: 'typescript',
              kind: 'module',
              name: 'api',
              language: 'typescript',
              path: 'backend/src/api',
              role: 'inside',
              stub: false,
              metadata: { layer: 'code' },
            },
          ],
          counts: { nodes: 2, edges: 0 },
        });
      }
      return slice();
    });

    renderWithQuery(
      <MemoryRouter future={routerFuture} initialEntries={['/projects/p1/graph-view?focus=s1']}>
        <Routes>
          <Route path="/projects/:projectId/graph-view" element={<GraphViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const nodeBtn = await screen.findByTestId('node-s1', {}, { timeout: 3000 });
    fireEvent.click(nodeBtn);
    const enterCode = await screen.findByRole('button', { name: GRAPH_VIEW_ENTER_CODE });
    fireEvent.click(enterCode);
    await waitFor(() =>
      expect(getGraphViewMock).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ focus: 's1', layer: 'code' }),
      ),
    );
    await screen.findByTestId('node-m1');
  });
});
