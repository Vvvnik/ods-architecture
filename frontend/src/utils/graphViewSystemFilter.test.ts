import { describe, expect, it } from 'vitest';

import type { GraphViewSlice } from '../api/graph-types.js';
import {
  applyGraphViewSystemFilter,
  availableGraphViewSystemFilters,
  normalizeGraphViewSystemFilter,
} from './graphViewSystemFilter.js';

function baseSlice(): GraphViewSlice {
  return {
    project_id: 'p1',
    analysis_run_id: 'r1',
    focus_id: null,
    focus_kind: null,
    layer: 'system',
    nodes: [
      {
        id: 'svc',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'compose',
        kind: 'service',
        name: 'svc',
        language: 'system',
        path: '/svc',
        role: 'inside',
        stub: false,
      },
      {
        id: 'grpc-proto:grpc_method:OrdersService/CreateOrder',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'grpc-proto',
        kind: 'grpc_method',
        name: 'CreateOrder',
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
        from: 'svc',
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
        from: 'svc',
        to: 'grpc-proto:grpc_method:OrdersService/CreateOrder',
        type: 'http_calls',
        metadata: { layer: 'system', protocol: 'grpc' },
      },
      {
        id: 'rpc',
        project_id: 'p1',
        analysis_run_id: 'r1',
        parser_id: 'bus',
        language: 'system',
        from: 'svc',
        to: 'topic:orders',
        type: 'rpc_handles',
        metadata: { layer: 'system' },
      },
    ],
    truncated: false,
    limits: { max_nodes: 200, max_edges: 500 },
    counts: { nodes: 2, edges: 3 },
    resolve_status: 'none',
    empty_reason: 'none',
    affiliation: null,
  };
}

describe('graphViewSystemFilter', () => {
  it('normalizes query value', () => {
    expect(normalizeGraphViewSystemFilter('infra')).toBe('infra');
    expect(normalizeGraphViewSystemFilter('grpc')).toBe('grpc');
    expect(normalizeGraphViewSystemFilter('bad')).toBe('all');
  });

  it('filters system slice by protocol family', () => {
    const slice = baseSlice();
    expect(applyGraphViewSystemFilter(slice, 'http').edges).toHaveLength(1);
    expect(applyGraphViewSystemFilter(slice, 'grpc').edges).toHaveLength(1);
    expect(applyGraphViewSystemFilter(slice, 'rpc_bus').edges).toHaveLength(1);
    expect(applyGraphViewSystemFilter(slice, 'infra').edges).toHaveLength(0);
  });

  it('lists only available filters for current slice', () => {
    const slice = baseSlice();
    expect(availableGraphViewSystemFilters(slice)).toEqual(['all', 'http', 'grpc', 'rpc_bus']);
  });
});
