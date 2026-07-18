import { describe, expect, it } from 'vitest';

import type { GraphEdgeDocument } from '../../src/domain/graph-edge.js';
import type { GraphNodeDocument } from '../../src/domain/graph-node.js';
import {
  matchCodeToService,
  pathMatchesServiceName,
  selectAffiliatedCodeRoots,
} from '../../src/services/graph-view-affiliation.js';

function node(
  partial: Partial<GraphNodeDocument> & Pick<GraphNodeDocument, 'id' | 'kind' | 'name'>,
): GraphNodeDocument {
  return {
    project_id: '11111111-1111-1111-1111-111111111111',
    analysis_run_id: '22222222-2222-2222-2222-222222222222',
    parser_id: 'test',
    language: partial.kind === 'service' ? 'system' : 'typescript',
    path: partial.path ?? `/${partial.name}`,
    ingested_at: new Date().toISOString(),
    metadata: {
      layer: partial.kind === 'service' ? 'system' : 'code',
      ...(partial.metadata ?? {}),
    },
    ...partial,
  };
}

describe('graph-view-affiliation', () => {
  it('matches path segment to service name', () => {
    expect(pathMatchesServiceName('backend/src/index.ts', 'backend')).toBe(true);
    expect(pathMatchesServiceName('frontend/src/App.tsx', 'frontend')).toBe(true);
    expect(pathMatchesServiceName('backend/src/index.ts', 'frontend')).toBe(false);
    expect(pathMatchesServiceName('docker/docker-compose.dev.yml', 'elasticsearch')).toBe(false);
  });

  it('view-only affiliates backend paths to backend service', () => {
    const backend = node({
      id: 'svc-backend',
      kind: 'service',
      name: 'backend',
      path: 'docker/docker-compose.dev.yml',
    });
    const frontend = node({
      id: 'svc-frontend',
      kind: 'service',
      name: 'frontend',
      path: 'docker/docker-compose.dev.yml',
    });
    const mod = node({
      id: 'mod-b',
      kind: 'module',
      name: 'api',
      path: 'backend/src/api',
    });
    const fe = node({
      id: 'mod-f',
      kind: 'module',
      name: 'pages',
      path: 'frontend/src/pages',
    });
    const all = [backend, frontend, mod, fe];
    const aff = matchCodeToService(backend, [mod, fe], all, []);
    expect(aff.mode).toBe('view_only');
    expect(aff.code_node_ids).toEqual(['mod-b']);

    const affFe = matchCodeToService(frontend, [mod, fe], all, []);
    expect(affFe.code_node_ids).toEqual(['mod-f']);
  });

  it('elasticsearch without path match → none', () => {
    const es = node({
      id: 'svc-es',
      kind: 'service',
      name: 'elasticsearch',
      path: 'docker/docker-compose.dev.yml',
    });
    const mod = node({
      id: 'mod-b',
      kind: 'module',
      name: 'api',
      path: 'backend/src/api',
    });
    const aff = matchCodeToService(es, [mod], [es, mod], []);
    expect(aff.mode).toBe('none');
    expect(aff.code_node_ids).toEqual([]);
  });

  it('selects roots whose parent is outside affiliated set', () => {
    const root = node({ id: 'm1', kind: 'module', name: 'm', path: 'backend/m' });
    const child = node({
      id: 'c1',
      kind: 'class',
      name: 'C',
      path: 'backend/m/C.ts',
      parent_id: 'm1',
    });
    const byId = new Map([
      [root.id, root],
      [child.id, child],
    ]);
    const roots = selectAffiliatedCodeRoots(new Set(['m1', 'c1']), byId);
    expect(roots.map((n) => n.id)).toEqual(['m1']);
  });

  it('explicit parent_id to service wins over view-only', () => {
    const svc = node({ id: 'svc', kind: 'service', name: 'backend', path: 'compose.yml' });
    const cls = node({
      id: 'cls',
      kind: 'class',
      name: 'X',
      path: 'other/X.ts',
      parent_id: 'svc',
    });
    const aff = matchCodeToService(svc, [cls], [svc, cls], [] as GraphEdgeDocument[]);
    expect(aff.mode).toBe('explicit');
    expect(aff.code_node_ids).toEqual(['cls']);
  });
});
