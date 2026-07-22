import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import type { GraphViewNode } from '../../api/graph-types.js';
import { getMessages } from '../../i18n/index.js';
import { GraphInspector } from './GraphInspector.js';

const { GRAPH_VIEW_OPEN_GRAPH_UI } = getMessages('en');

function serviceNode(id: string, name: string): GraphViewNode {
  return {
    id,
    project_id: 'p1',
    analysis_run_id: 'r1',
    parser_id: 'compose',
    kind: 'service',
    name,
    language: 'system',
    path: '',
    role: 'focus',
    stub: false,
  };
}

describe('GraphInspector Graph UI action (020)', () => {
  afterEach(() => {
    cleanup();
  });

  it('disables Graph UI action when no binds_service link', () => {
    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={serviceNode('svc-1', 'backend')}
          edges={[]}
          layer="system"
          onEnter={() => undefined}
          graphUiAppId={null}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: GRAPH_VIEW_OPEN_GRAPH_UI });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('links to graph-ui?app= when graphUiAppId is set', () => {
    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={serviceNode('svc-1', 'backend')}
          edges={[]}
          layer="system"
          onEnter={() => undefined}
          graphUiAppId="react-ui:ui_app:frontend"
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: GRAPH_VIEW_OPEN_GRAPH_UI });
    expect(link.getAttribute('href')).toBe(
      '/projects/p1/graph-ui?app=react-ui%3Aui_app%3Afrontend',
    );
  });

  it('disables Graph UI action without a selected node', () => {
    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={null}
          edges={[]}
          layer="system"
          onEnter={() => undefined}
          graphUiAppId="react-ui:ui_app:frontend"
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: GRAPH_VIEW_OPEN_GRAPH_UI });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});
