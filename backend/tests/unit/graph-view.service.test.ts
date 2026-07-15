import { describe, expect, it } from 'vitest';

import type { GraphEdgeDocument } from '../../src/domain/graph-edge.js';
import type { GraphNodeDocument } from '../../src/domain/graph-node.js';
import {
  buildViewSlicePure,
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

  it('resolve_from code falls back to system or service path', () => {
    const allNodes = [
      node({ id: 's1', kind: 'service', name: 'Api', path: '/src/Api' }),
      node({
        id: 'c1',
        kind: 'class',
        name: 'Foo',
        path: '/src/Api/Foo.cs',
        language: 'csharp',
        metadata: {},
      }),
      node({
        id: 'c2',
        kind: 'class',
        name: 'Orphan',
        path: '/other/X.cs',
        language: 'csharp',
        metadata: {},
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
    expect(slice.focus_id).toBeNull();
    expect(slice.resolve_status).toBe('system_fallback');
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
});
