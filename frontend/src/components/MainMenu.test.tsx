import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { MainMenu } from './MainMenu.js';
import { routerFuture } from '../app/router-future.js';
import { getMessages } from '../i18n/index.js';
import { LocaleProvider } from '../i18n/locale.js';

vi.mock('../context/SessionContext.js', () => ({
  useSession: () => ({
    activeProjectId: 'proj-1',
    analysisRunning: false,
    setActiveProjectId: vi.fn(),
  }),
}));

describe('MainMenu graph entries (T012)', () => {
  it('shows graph entries with project routes and no sync action', () => {
    const messages = getMessages('en');
    render(
      <LocaleProvider>
        <MemoryRouter future={routerFuture} initialEntries={['/projects/proj-1']}>
          <Routes>
            <Route path="/projects/:projectId" element={<MainMenu />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>,
    );

    const analysis = screen.getByRole('link', { name: messages.GRAPH_MENU_ANALYSIS });
    const view = screen.getByRole('link', { name: messages.GRAPH_MENU_VIEW });
    const graphUi = screen.getByRole('link', { name: messages.GRAPH_MENU_UI });
    expect(analysis.getAttribute('href')).toBe('/projects/proj-1/graph');
    expect(view.getAttribute('href')).toBe('/projects/proj-1/graph-view');
    expect(graphUi.getAttribute('href')).toBe('/projects/proj-1/graph-ui');
    expect(screen.queryByRole('button', { name: messages.actionSync })).toBeNull();
  });
});
