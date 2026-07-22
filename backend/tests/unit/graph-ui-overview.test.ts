import { describe, expect, it, vi } from 'vitest';

import { GraphUiService } from '../../src/services/graph-ui.service.js';

function makeNode(partial: Record<string, unknown>) {
  return {
    project_id: 'p1',
    analysis_run_id: 'r1',
    parser_id: 'react-ui',
    language: 'typescript',
    path: 'frontend/src/main.tsx',
    ingested_at: '2026-07-22T00:00:00.000Z',
    metadata: { layer: 'ui' },
    ...partial,
  };
}

describe('GraphUiService overview (020)', () => {
  it('returns empty_reason no_ui_landscape when no ui_app nodes', async () => {
    const analysisRunRepository = {
      listByProjectId: vi.fn(async () => [
        { id: 'r1', status: 'success', ingest_status: 'success', project_id: 'p1' },
      ]),
      getById: vi.fn(async () => ({
        id: 'r1',
        status: 'success',
        ingest_status: 'success',
        project_id: 'p1',
      })),
    };
    const graphNodeRepository = {
      listByKinds: vi.fn(async () => ({ items: [], total: 0 })),
      countByProjectAndRun: vi.fn(async () => 10),
      getByLogicalId: vi.fn(),
    };
    const graphEdgeRepository = {
      listIncidentToNodes: vi.fn(async () => []),
    };

    const service = new GraphUiService(
      analysisRunRepository as never,
      graphNodeRepository as never,
      graphEdgeRepository as never,
    );

    const slice = await service.getOverview('p1', { analysisRunId: 'r1' });
    expect(slice.empty_reason).toBe('no_ui_landscape');
    expect(slice.nodes).toEqual([]);
  });

  it('returns overview frames for an app with routes/screens', async () => {
    const app = makeNode({
      id: 'react-ui:ui_app:frontend',
      kind: 'ui_app',
      name: 'frontend',
      parent_id: null,
    });
    const route = makeNode({
      id: 'react-ui:ui_route:frontend/import',
      kind: 'ui_route',
      name: '/import',
      parent_id: app.id,
    });
    const screen = makeNode({
      id: 'react-ui:ui_screen:frontend/ImportPage',
      kind: 'ui_screen',
      name: 'Import',
      parent_id: route.id,
    });

    const analysisRunRepository = {
      listByProjectId: vi.fn(),
      getById: vi.fn(async () => ({
        id: 'r1',
        status: 'success',
        ingest_status: 'success',
        project_id: 'p1',
      })),
    };
    const graphNodeRepository = {
      listByKinds: vi.fn(async () => ({
        items: [app, route, screen],
        total: 3,
      })),
      countByProjectAndRun: vi.fn(async () => 3),
      getByLogicalId: vi.fn(),
    };
    const graphEdgeRepository = {
      listIncidentToNodes: vi.fn(async () => [
        {
          id: 'e1',
          from: app.id,
          to: route.id,
          type: 'contains',
          metadata: { layer: 'ui' },
        },
        {
          id: 'e2',
          from: route.id,
          to: screen.id,
          type: 'contains',
          metadata: { layer: 'ui' },
        },
        {
          id: 'e-binds',
          from: app.id,
          to: 'compose:service:docker/docker-compose.dev.yml#frontend',
          type: 'binds_service',
          metadata: { layer: 'ui' },
        },
      ]),
    };

    const service = new GraphUiService(
      analysisRunRepository as never,
      graphNodeRepository as never,
      graphEdgeRepository as never,
    );

    const slice = await service.getOverview('p1', { analysisRunId: 'r1' });
    expect(slice.empty_reason).toBeNull();
    expect(slice.app_id).toBe(app.id);
    expect(slice.nodes.map((n) => n.kind).sort()).toEqual(
      ['ui_app', 'ui_route', 'ui_screen'].sort(),
    );
    expect(slice.edges.map((e) => e.type).sort()).toEqual(
      ['binds_service', 'contains', 'contains'].sort(),
    );
  });
});
