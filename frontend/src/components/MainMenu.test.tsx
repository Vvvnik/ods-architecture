import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { MainMenu } from './MainMenu.js';
import { routerFuture } from '../app/router-future.js';
import { GRAPH_MENU_ANALYSIS, GRAPH_MENU_VIEW } from '../i18n/ru.js';

vi.mock('../context/SessionContext.js', () => ({
  useSession: () => ({
    activeProjectId: 'proj-1',
    analysisRunning: false,
    setActiveProjectId: vi.fn(),
  }),
}));

vi.mock('../hooks/useSync.js', () => ({
  useSync: () => ({
    canSync: false,
    isRunning: false,
    triggerSync: vi.fn(),
    syncError: null,
  }),
}));

describe('MainMenu graph entries (T012)', () => {
  it('shows Граф анализ and Граф просмотр with project routes', () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<MainMenu />} />
        </Routes>
      </MemoryRouter>,
    );

    const analysis = screen.getByRole('link', { name: GRAPH_MENU_ANALYSIS });
    const view = screen.getByRole('link', { name: GRAPH_MENU_VIEW });
    expect(analysis.getAttribute('href')).toBe('/projects/proj-1/graph');
    expect(view.getAttribute('href')).toBe('/projects/proj-1/graph-view');
  });
});
