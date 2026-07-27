import { describe, expect, it } from 'vitest';

import type { GraphEdgeDocument } from '../../src/domain/graph-edge.js';
import type { GraphNodeDocument } from '../../src/domain/graph-node.js';
import {
  buildViewSlicePure,
  prioritizeInsideNodes,
  resolveServiceContext,
  selectSystemPeers,
  truncateSystemPeers,
} from '../../src/services/graph-view-slice.js';

function node(
  partial: Partial<GraphNodeDocument> & Pick<GraphNodeDocument, 'id' | 'kind' | 'name'>,
): GraphNodeDocument {
  return {
    project_id: '11111111-1111-1111-1111-111111111111',
    analysis_run_id: '22222222-2222-2222-2222-222222222222',
    parser_id: 'test',
    language: 'system',
    path: partial.path ?? `/${partial.name}`,
    ingested_at: new Date().toISOString(),
    metadata: { layer: 'system', ...(partial.metadata ?? {}) },
    ...partial,
  };
}

function edge(
  from: string,
  to: string,
  type = 'depends_on',
): GraphEdgeDocument {
  return {
    id: `${from}->${to}:${type}`,
    project_id: '11111111-1111-1111-1111-111111111111',
    analysis_run_id: '22222222-2222-2222-2222-222222222222',
    parser_id: 'test',
    language: 'system',
    from,
    to,
    type,
    path: null,
    ingested_at: new Date().toISOString(),
    metadata: { layer: 'system' },
  };
}

describe('graph-view-slice', () => {
  it('selectSystemPeers keeps topics only without broker', () => {
    const withBroker = [
      node({ id: 's1', kind: 'service', name: 'Api' }),
      node({ id: 'b1', kind: 'broker', name: 'kafka' }),
      node({ id: 't1', kind: 'message_topic', name: 'orders', parent_id: 'b1' }),
    ];
    expect(selectSystemPeers(withBroker).map((n) => n.id).sort()).toEqual(['b1', 's1']);

    const noBroker = [
      node({ id: 's1', kind: 'service', name: 'Api' }),
      node({ id: 't1', kind: 'message_topic', name: 'orders' }),
    ];
    expect(selectSystemPeers(noBroker).map((n) => n.id).sort()).toEqual(['s1', 't1']);
  });

  it('truncates preferring services over infra by name tail', () => {
    const peers = [
      node({ id: 'db1', kind: 'database', name: 'db' }),
      node({ id: 's1', kind: 'service', name: 'A' }),
      node({ id: 's2', kind: 'service', name: 'B' }),
      node({ id: 'db2', kind: 'database', name: 'zz' }),
    ];
    const edges = [edge('s1', 'db1', 'connects_to'), edge('s2', 'db2', 'connects_to')];
    const { kept, omitted } = truncateSystemPeers(peers, edges, 3);
    expect(omitted).toBe(1);
    expect(kept.filter((n) => n.kind === 'service')).toHaveLength(2);
    expect(kept.some((n) => n.kind === 'database')).toBe(true);
  });

  it('builds System slice without class nodes', () => {
    const allNodes = [
      node({ id: 's1', kind: 'service', name: 'Api' }),
      node({ id: 'db1', kind: 'database', name: 'pg' }),
      node({
        id: 'c1',
        kind: 'class',
        name: 'Foo',
        language: 'csharp',
        metadata: {},
      }),
    ];
    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [edge('s1', 'db1', 'connects_to')],
      focusId: null,
    });
    expect(slice.nodes.map((n) => n.kind).sort()).toEqual(['database', 'service']);
    expect(slice.empty_reason).toBe('none');
  });

  it('focus service shows externals only and empty DB hierarchy', () => {
    const allNodes = [
      node({ id: 's1', kind: 'service', name: 'Api', path: '/src/Api' }),
      node({ id: 's2', kind: 'service', name: 'Billing', path: '/src/Billing' }),
      node({
        id: 'ep1',
        kind: 'http_endpoint',
        name: 'GET /x',
        parent_id: 's1',
        path: '/src/Api',
      }),
      node({ id: 'db1', kind: 'database', name: 'pg' }),
    ];
    const edges = [
      edge('s1', 'db1', 'connects_to'),
      edge('s1', 's2', 'http_calls'),
    ];

    const focused = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: edges,
      focusId: 's1',
    });
    expect(focused.focus_id).toBe('s1');
    expect(focused.nodes.some((n) => n.id === 'ep1' && n.role === 'inside')).toBe(true);
    expect(focused.nodes.some((n) => n.id === 'db1' && n.role === 'external')).toBe(true);
    expect(focused.nodes.some((n) => n.id === 's2' && n.role === 'external')).toBe(true);

    // 014: http_calls service → http_endpoint kept in focused slice
    const callEdges = [
      edge('s2', 'ep1', 'http_calls'),
      edge('s1', 'db1', 'connects_to'),
    ];
    const callerFocus = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: callEdges,
      focusId: 's2',
    });
    expect(callerFocus.edges.some((e) => e.type === 'http_calls' && e.to === 'ep1')).toBe(true);
    expect(callerFocus.nodes.some((n) => n.id === 'ep1')).toBe(true);

    const dbFocus = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: edges,
      focusId: 'db1',
    });
    expect(dbFocus.nodes.filter((n) => n.role === 'inside')).toHaveLength(0);
    expect(dbFocus.nodes.some((n) => n.id === 's1' && n.role === 'external')).toBe(true);
  });

  it('broker includes topics inside', () => {
    const allNodes = [
      node({ id: 'b1', kind: 'broker', name: 'kafka' }),
      node({ id: 't1', kind: 'message_topic', name: 'orders', parent_id: 'b1' }),
      node({ id: 's1', kind: 'service', name: 'Api' }),
    ];
    const edges = [edge('s1', 't1', 'publishes')];
    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: edges,
      focusId: 'b1',
    });
    expect(slice.nodes.some((n) => n.id === 't1' && n.role === 'inside')).toBe(true);
    expect(slice.nodes.some((n) => n.id === 's1' && n.role === 'external')).toBe(true);
  });

  it('resolve_from code focuses the code node (exact_code)', () => {
    const allNodes = [
      node({ id: 's1', kind: 'service', name: 'Api', path: '/src/Api' }),
      node({
        id: 'c1',
        kind: 'class',
        name: 'Foo',
        path: '/src/Api/Foo.cs',
        language: 'csharp',
        metadata: { layer: 'code' },
      }),
      node({
        id: 'c2',
        kind: 'class',
        name: 'Orphan',
        path: '/other/X.cs',
        language: 'csharp',
        metadata: { layer: 'code' },
      }),
    ];
    const byId = new Map(allNodes.map((n) => [n.id, n]));
    expect(resolveServiceContext(allNodes[1]!, byId, allNodes).service?.id).toBe('s1');

    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [],
      resolveFromId: 'c2',
    });
    expect(slice.focus_id).toBe('c2');
    expect(slice.resolve_status).toBe('exact_code');
    expect(slice.layer).toBe('code');
  });

  it('layer=code on service shows affiliated roots; empty for no match', () => {
    const allNodes = [
      node({
        id: 'svc-b',
        kind: 'service',
        name: 'backend',
        path: 'docker/docker-compose.dev.yml',
      }),
      node({
        id: 'svc-es',
        kind: 'service',
        name: 'elasticsearch',
        path: 'docker/docker-compose.dev.yml',
      }),
      node({
        id: 'mod',
        kind: 'module',
        name: 'api',
        path: 'backend/src/api',
        language: 'typescript',
        metadata: { layer: 'code' },
      }),
      node({
        id: 'cls',
        kind: 'class',
        name: 'Svc',
        path: 'backend/src/api/Svc.ts',
        parent_id: 'mod',
        language: 'typescript',
        metadata: { layer: 'code' },
      }),
    ];
    const codeSlice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [],
      focusId: 'svc-b',
      layer: 'code',
    });
    expect(codeSlice.layer).toBe('code');
    expect(codeSlice.empty_reason).toBe('none');
    expect(codeSlice.nodes.some((n) => n.id === 'mod' && n.role === 'inside')).toBe(true);
    expect(codeSlice.nodes.some((n) => n.id === 'cls')).toBe(false);

    const emptyEs = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [],
      focusId: 'svc-es',
      layer: 'code',
    });
    expect(emptyEs.empty_reason).toBe('no_related_code');
  });

  it('code focus drills parent_id children and includes call externals', () => {
    const allNodes = [
      node({
        id: 'mod',
        kind: 'module',
        name: 'api',
        path: 'backend/src/api',
        language: 'typescript',
        metadata: { layer: 'code' },
      }),
      node({
        id: 'cls',
        kind: 'class',
        name: 'Svc',
        path: 'backend/src/api/Svc.ts',
        parent_id: 'mod',
        language: 'typescript',
        metadata: { layer: 'code' },
      }),
      node({
        id: 'other',
        kind: 'class',
        name: 'Other',
        path: 'frontend/Other.ts',
        language: 'typescript',
        metadata: { layer: 'code' },
      }),
    ];
    const edges = [
      {
        id: 'e1',
        project_id: allNodes[0]!.project_id,
        analysis_run_id: allNodes[0]!.analysis_run_id,
        parser_id: 'test',
        language: 'typescript',
        from: 'cls',
        to: 'other',
        type: 'calls',
        path: null,
        ingested_at: new Date().toISOString(),
        metadata: { layer: 'code' },
      },
    ];
    const modSlice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: edges,
      focusId: 'mod',
    });
    expect(modSlice.nodes.some((n) => n.id === 'cls' && n.role === 'inside')).toBe(true);

    const clsSlice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: edges,
      focusId: 'cls',
    });
    expect(clsSlice.nodes.some((n) => n.id === 'other' && n.role === 'external')).toBe(true);
    expect(clsSlice.edges.some((e) => e.type === 'calls')).toBe(true);
  });

  it('empty_reason when only code nodes', () => {
    const allNodes = [
      node({
        id: 'c1',
        kind: 'class',
        name: 'Foo',
        language: 'csharp',
        metadata: {},
      }),
    ];
    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [],
    });
    expect(slice.empty_reason).toBe('no_system_participants');
    expect(slice.nodes).toHaveLength(0);
  });

  it('prioritizeInsideNodes keeps non-endpoints when capping', () => {
    const nodes = [
      node({ id: 'ep1', kind: 'http_endpoint', name: 'GET /a' }),
      node({ id: 'ep2', kind: 'http_endpoint', name: 'GET /b' }),
      node({ id: 'proj', kind: 'dotnet_project', name: 'App.csproj' }),
      node({ id: 'topic', kind: 'message_topic', name: 'orders' }),
    ];
    const { kept, omitted } = prioritizeInsideNodes(nodes, 2);
    expect(omitted).toBe(2);
    expect(kept.map((n) => n.kind).sort()).toEqual(['dotnet_project', 'message_topic']);
  });

  it('root system slice keeps depends_on between services', () => {
    const allNodes = [
      node({ id: 's1', kind: 'service', name: 'application' }),
      node({ id: 's2', kind: 'service', name: 'identity' }),
      node({ id: 'ep1', kind: 'http_endpoint', name: 'GET /x', parent_id: 's1' }),
    ];
    const allEdges = [
      edge('s1', 's2', 'depends_on'),
      edge('s1', 'ep1', 'exposes'),
    ];
    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges,
    });
    expect(slice.focus_id).toBeNull();
    expect(slice.edges.some((e) => e.type === 'depends_on' && e.to === 's2')).toBe(true);
    expect(slice.nodes.every((n) => n.kind !== 'http_endpoint')).toBe(true);
  });

  it('focused service slice caps endpoints and stays within maxNodes', () => {
    const focus = node({ id: 's1', kind: 'service', name: 'application' });
    const inside = Array.from({ length: 50 }, (_, i) =>
      node({
        id: `ep${i}`,
        kind: 'http_endpoint',
        name: `GET /${i}`,
        parent_id: 's1',
      }),
    );
    inside.push(node({ id: 'proj', kind: 'dotnet_project', name: 'App', parent_id: 's1' }));
    const peers = [
      node({ id: 's2', kind: 'service', name: 'identity' }),
      node({ id: 'db1', kind: 'database', name: 'pg' }),
    ];
    const allNodes = [focus, ...inside, ...peers];
    const allEdges = [
      edge('s1', 's2', 'depends_on'),
      edge('s1', 'db1', 'depends_on'),
      ...inside.slice(0, 50).map((n) => edge('s1', n.id, 'exposes')),
    ];
    const slice = buildViewSlicePure({
      projectId: focus.project_id,
      analysisRunId: focus.analysis_run_id,
      allNodes,
      allEdges,
      focusId: 's1',
      maxNodes: 20,
      maxEdges: 100,
    });
    expect(slice.nodes.length).toBeLessThanOrEqual(20);
    expect(slice.nodes.some((n) => n.id === 'proj')).toBe(true);
    expect(slice.edges.some((e) => e.type === 'depends_on')).toBe(true);
    expect(slice.truncated).toBe(true);
  });
});
