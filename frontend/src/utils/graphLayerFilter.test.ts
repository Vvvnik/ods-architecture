import { describe, expect, it } from 'vitest';

import {
  buildNodeIndex,
  filterEdgesByLayer,
  filterNodesByLayer,
  nodeLayer,
  readGraphLayerFilter,
  writeGraphLayerFilter,
} from './graphLayerFilter.js';
import type { GraphEdge, GraphNode } from '../api/graph-types.js';
import { graphPageTitle } from '../i18n/index.js';

function node(id: string, layer?: string): GraphNode {
  return {
    id,
    project_id: 'p1',
    analysis_run_id: 'r1',
    parser_id: 'compose',
    kind: 'service',
    name: id,
    language: layer === 'system' ? 'system' : 'csharp',
    path: id,
    metadata: layer ? { layer } : {},
  };
}

function edge(from: string, to: string): GraphEdge {
  return {
    id: `${from}->${to}`,
    project_id: 'p1',
    analysis_run_id: 'r1',
    parser_id: 'compose',
    language: 'system',
    from,
    to,
    type: 'depends_on',
    path: 'docker-compose.yml',
  };
}

describe('graphLayerFilter', () => {
  it('reads and writes session filter', () => {
    writeGraphLayerFilter('system');
    expect(readGraphLayerFilter()).toBe('system');
    writeGraphLayerFilter('all');
  });

  it('filters nodes and edges by layer (R8)', () => {
    const nodes = [node('code-1'), node('sys-1', 'system')];
    expect(filterNodesByLayer(nodes, 'system')).toHaveLength(1);
    expect(nodeLayer(nodes[0]!)).toBe('code');
    expect(nodeLayer(nodes[1]!)).toBe('system');

    const index = buildNodeIndex(nodes);
    const edges = [edge('code-1', 'sys-1'), edge('sys-1', 'sys-1')];
    expect(filterEdgesByLayer(edges, index, 'system')).toHaveLength(1);
    expect(filterEdgesByLayer(edges, index, 'code')).toHaveLength(0);
  });

  it('picks graph page title by layer filter', () => {
    expect(graphPageTitle('all')).toBe('Graph analysis');
    expect(graphPageTitle('code')).toBe('Graph analysis (code)');
    expect(graphPageTitle('system')).toBe('Graph analysis (system)');
  });
});
