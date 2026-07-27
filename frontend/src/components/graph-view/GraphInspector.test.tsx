import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { GraphViewEdge, GraphViewNode } from '../../api/graph-types.js';
import { getMessages } from '../../i18n/index.js';

const { GRAPH_VIEW_OPEN_ANALYSIS } = getMessages('en');
import { GraphInspector } from './GraphInspector.js';

describe('GraphInspector analysis action (014)', () => {
  it('disables the analysis action without focus', () => {
    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={null}
          edges={[]}
          layer="system"
          onEnter={() => undefined}
        />
      </MemoryRouter>,
    );

    const button = screen.getByRole('button', { name: GRAPH_VIEW_OPEN_ANALYSIS });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it('links to graph?select= when node focused', () => {
    const node: GraphViewNode = {
      id: 'svc-1',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      kind: 'service',
      name: 'backend',
      language: 'system',
      path: '',
      role: 'focus',
      stub: false,
    };

    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={node}
          edges={[]}
          layer="system"
          onEnter={() => undefined}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: GRAPH_VIEW_OPEN_ANALYSIS });
    expect(link.getAttribute('href')).toBe('/projects/p1/graph?select=svc-1');
  });

  it('shows relationships with short names, not compose ids', () => {
    const backend: GraphViewNode = {
      id: 'compose:service:docker/docker-compose.dev.yml#backend',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      kind: 'service',
      name: 'backend',
      language: 'system',
      path: '',
      role: 'focus',
      stub: false,
    };
    const frontend: GraphViewNode = {
      id: 'compose:service:docker/docker-compose.dev.yml#frontend',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      kind: 'service',
      name: 'frontend',
      language: 'system',
      path: '',
      role: 'external',
      stub: false,
    };
    const es: GraphViewNode = {
      id: 'compose:service:docker/docker-compose.dev.yml#elasticsearch',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      kind: 'database',
      name: 'elasticsearch',
      language: 'system',
      path: '',
      role: 'external',
      stub: false,
    };
    const edges: GraphViewEdge[] = [
      {
        id: 'e1',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'compose',
        type: 'depends_on',
        from: backend.id,
        to: es.id,
        language: 'system',
      },
      {
        id: 'e2',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'compose',
        type: 'depends_on',
        from: frontend.id,
        to: backend.id,
        language: 'system',
      },
    ];

    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={backend}
          edges={edges}
          nodes={[backend, frontend, es]}
          layer="system"
          onEnter={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('backend: → elasticsearch')).toBeTruthy();
    expect(screen.getByText('backend: ← frontend')).toBeTruthy();
    expect(screen.queryByText(/docker-compose/)).toBeNull();
  });

  it('shows endpoint relationships as service to HTTP call', () => {
    const frontend: GraphViewNode = {
      id: 'compose:service:docker/docker-compose.dev.yml#frontend',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      kind: 'service',
      name: 'frontend',
      language: 'system',
      path: '',
      role: 'external',
      stub: false,
    };
    const endpoint: GraphViewNode = {
      id: 'http:GET:/api/v1/projects',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'ts-api-routes',
      kind: 'http_endpoint',
      name: 'GET /api/v1/projects',
      language: 'typescript',
      path: '',
      role: 'focus',
      stub: false,
    };
    const edges: GraphViewEdge[] = [
      {
        id: 'e-call',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'ts-http-calls',
        type: 'http_calls',
        from: frontend.id,
        to: endpoint.id,
        language: 'typescript',
      },
    ];

    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={endpoint}
          edges={edges}
          nodes={[frontend, endpoint]}
          layer="system"
          onEnter={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('frontend: → HTTP call')).toBeTruthy();
    expect(screen.queryByText(/docker-compose/)).toBeNull();
  });

  it('shows «N more» for relationships beyond the initial page', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const rabbit: GraphViewNode = {
      id: 'compose:service:docker-compose.yml#rabbit',
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      kind: 'service',
      name: 'rabbit',
      language: 'system',
      path: '',
      role: 'focus',
      stub: false,
    };
    const peers = Array.from({ length: 10 }, (_, i) => {
      const name = `svc${i}`;
      return {
        id: `compose:service:docker-compose.yml#${name}`,
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'compose',
        kind: 'service' as const,
        name,
        language: 'system',
        path: '',
        role: 'external' as const,
        stub: false,
      };
    });
    const edges: GraphViewEdge[] = peers.map((peer, i) => ({
      id: `e${i}`,
      project_id: 'p1',
      analysis_run_id: 'r1',
      parser_id: 'compose',
      type: 'depends_on',
      from: peer.id,
      to: rabbit.id,
      language: 'system',
    }));

    render(
      <MemoryRouter>
        <GraphInspector
          projectId="p1"
          node={rabbit}
          edges={edges}
          nodes={[rabbit, ...peers]}
          layer="system"
          onEnter={() => undefined}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('rabbit: ← svc0')).toBeTruthy();
    expect(screen.queryByText('rabbit: ← svc8')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '2 more' }));
    expect(screen.getByText('rabbit: ← svc8')).toBeTruthy();
    expect(screen.getByText('rabbit: ← svc9')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /more/ })).toBeNull();
  });
});
