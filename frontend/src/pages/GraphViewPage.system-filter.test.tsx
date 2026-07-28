import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { routerFuture } from '../app/router-future.js';
import type { GraphViewSlice } from '../api/graph-types.js';
import { getMessages } from '../i18n/index.js';

const {
  GRAPH_VIEW_SYSTEM_FILTER_GRPC,
  GRAPH_VIEW_SYSTEM_FILTER_HTTP,
  GRAPH_VIEW_SYSTEM_FILTER_RPC_BUS,
  GRAPH_VIEW_SYSTEM_FILTER_INFRA,
} = getMessages('en');

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
    viewEdges,
  }: {
    viewEdges: Array<{ id: string }>;
  }) => <div data-testid="edge-count">{viewEdges.length}</div>,
}));

import { renderWithQuery } from './graph-view-test-utils.js';
import { getGraphView } from '../api/graph.js';
import { GraphViewPage } from './GraphViewPage.js';

const getGraphViewMock = vi.mocked(getGraphView);

function slice(): GraphViewSlice {
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
      {
        id: 'grpc-proto:grpc_method:OrdersService/CreateOrder',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'grpc-proto',
        kind: 'grpc_method',
        name: 'OrdersService/CreateOrder',
        language: 'system',
        path: '/proto/orders.proto',
        role: 'inside',
        stub: false,
      },
    ],
    edges: [
      {
        id: 'http',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'dotnet-http-calls',
        language: 'system',
        from: 's1',
        to: 'ext:http',
        type: 'http_calls',
        metadata: { layer: 'system', protocol: 'http' },
      },
      {
        id: 'grpc',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'dotnet-grpc-calls',
        language: 'system',
        from: 's1',
        to: 'grpc-proto:grpc_method:OrdersService/CreateOrder',
        type: 'http_calls',
        metadata: { layer: 'system', protocol: 'grpc' },
      },
    ],
    truncated: false,
    limits: { max_nodes: 200, max_edges: 500 },
    counts: { nodes: 2, edges: 2 },
    resolve_status: 'none',
    empty_reason: 'none',
    affiliation: null,
  };
}

describe('GraphViewPage system filters', () => {
  it('filters edges by selected protocol', async () => {
    getGraphViewMock.mockResolvedValue(slice());

    renderWithQuery(
      <MemoryRouter future={routerFuture} initialEntries={['/projects/p1/graph-view']}>
        <Routes>
          <Route path="/projects/:projectId/graph-view" element={<GraphViewPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(screen.getByTestId('edge-count').textContent).toBe('2'));
    expect(screen.queryByRole('button', { name: GRAPH_VIEW_SYSTEM_FILTER_RPC_BUS })).toBeNull();
    expect(screen.queryByRole('button', { name: GRAPH_VIEW_SYSTEM_FILTER_INFRA })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: GRAPH_VIEW_SYSTEM_FILTER_HTTP }));
    await waitFor(() => expect(screen.getByTestId('edge-count').textContent).toBe('1'));
    fireEvent.click(screen.getByRole('button', { name: GRAPH_VIEW_SYSTEM_FILTER_GRPC }));
    await waitFor(() => expect(screen.getByTestId('edge-count').textContent).toBe('1'));
  });
});
