/**
 * Contract-level checks for layer=code / no_related_code (012 T014).
 * Pure slice builder — same behaviour as GET .../graph/view after load.
 */
import { describe, expect, it } from 'vitest';

import type { GraphNodeDocument } from '../../src/domain/graph-node.js';
import { buildViewSlicePure } from '../../src/services/graph-view-slice.js';

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

describe('graph-view code layer (T014)', () => {
  it('layer=code for path-matched service returns roots', () => {
    const allNodes = [
      node({
        id: 'svc',
        kind: 'service',
        name: 'backend',
        path: 'docker/docker-compose.dev.yml',
      }),
      node({
        id: 'mod',
        kind: 'module',
        name: 'api',
        path: 'backend/src/api',
      }),
    ];
    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [],
      focusId: 'svc',
      layer: 'code',
    });
    expect(slice.empty_reason).toBe('none');
    expect(slice.layer).toBe('code');
    expect(slice.nodes.some((n) => n.id === 'mod')).toBe(true);
  });

  it('infra service without path match → no_related_code', () => {
    const allNodes = [
      node({
        id: 'es',
        kind: 'service',
        name: 'elasticsearch',
        path: 'docker/docker-compose.dev.yml',
      }),
      node({
        id: 'mod',
        kind: 'module',
        name: 'api',
        path: 'backend/src/api',
      }),
    ];
    const slice = buildViewSlicePure({
      projectId: allNodes[0]!.project_id,
      analysisRunId: allNodes[0]!.analysis_run_id,
      allNodes,
      allEdges: [],
      focusId: 'es',
      layer: 'code',
    });
    expect(slice.empty_reason).toBe('no_related_code');
  });
});
