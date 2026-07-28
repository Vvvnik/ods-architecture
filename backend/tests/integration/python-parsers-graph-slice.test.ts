import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import type { GraphEdgeDocument } from '../../src/domain/graph-edge.js';
import type { GraphNodeDocument } from '../../src/domain/graph-node.js';
import { pythonApiRoutesIngestAdapter } from '../../src/services/ingest/adapters/python-api-routes.ingest.js';
import { pythonHttpCallsIngestAdapter } from '../../src/services/ingest/adapters/python-http-calls.ingest.js';
import { pythonGrpcCallsIngestAdapter } from '../../src/services/ingest/adapters/grpc-calls.ingest.js';
import { SYSTEM_INSIDE_KINDS } from '../../src/services/graph-view.types.js';
import { buildViewSlicePure } from '../../src/services/graph-view-slice.js';
import { runParserCli } from '../helpers/parser-cli.js';

const fixtureRoot = join(process.cwd(), '../docker/fixtures/repos/python-http-grpc-demo');

function asNode(
  partial: Partial<GraphNodeDocument> & Pick<GraphNodeDocument, 'id' | 'kind' | 'name'>,
): GraphNodeDocument {
  return {
    project_id: 'p-py',
    analysis_run_id: 'r-py',
    parser_id: partial.parser_id ?? 'test',
    language: partial.language ?? 'system',
    path: partial.path ?? '',
    ingested_at: new Date().toISOString(),
    metadata: { layer: 'system', ...(partial.metadata ?? {}) },
    ...partial,
  };
}

describe('python parsers graph slice data path', () => {
  it('system slice with service focus shows Python endpoints and http_calls', () => {
    const routesOut = '/tmp/ods-py-graph-routes.json';
    const httpOut = '/tmp/ods-py-graph-http.json';
    const grpcOut = '/tmp/ods-py-graph-grpc.json';

    runParserCli({
      parserId: 'python-api-routes',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: [
        'fastapi_app/main.py',
        'flask_app/app.py',
        'django_app/urls.py',
        'django_app/api_urls.py',
      ],
      outputPath: routesOut,
      install: false,
    });
    runParserCli({
      parserId: 'python-http-calls',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: [
        'http_clients/client_httpx.py',
        'http_clients/client_requests.py',
        'http_clients/client_aiohttp.py',
      ],
      outputPath: httpOut,
      install: false,
    });
    runParserCli({
      parserId: 'python-grpc-calls',
      entry: 'run.sh',
      workingCopyRoot: fixtureRoot,
      files: ['grpc_client/client.py'],
      outputPath: grpcOut,
      install: false,
    });

    const routesEnv = JSON.parse(readFileSync(routesOut, 'utf8'));
    const httpEnv = JSON.parse(readFileSync(httpOut, 'utf8'));
    const grpcEnv = JSON.parse(readFileSync(grpcOut, 'utf8'));

    const baseCtx = {
      project_id: 'p-py',
      analysis_run_id: 'r-py',
      schema_version: '1',
      files_analyzed: [] as string[],
      incremental: false,
      affected_paths: [] as string[],
      deleted_paths: [] as string[],
    };

    const routes = pythonApiRoutesIngestAdapter.transform(routesEnv.model, {
      ...baseCtx,
      parser_id: 'python-api-routes',
    });
    const http = pythonHttpCallsIngestAdapter.transform(httpEnv.model, {
      ...baseCtx,
      parser_id: 'python-http-calls',
    });
    const grpc = pythonGrpcCallsIngestAdapter.transform(grpcEnv.model, {
      ...baseCtx,
      parser_id: 'python-grpc-calls',
    });

    const endpoints = routes.nodes.filter((n) => n.kind === 'http_endpoint');
    expect(endpoints.length).toBeGreaterThanOrEqual(3);
    expect(endpoints.every((n) => SYSTEM_INSIDE_KINDS.has(n.kind as never))).toBe(true);

    const httpCalls = [...http.edges, ...grpc.edges].filter((e) => e.type === 'http_calls');
    expect(httpCalls.length).toBeGreaterThanOrEqual(3);
    expect(httpCalls.some((e) => e.metadata?.protocol === 'grpc')).toBe(true);

    const serviceIds = new Set(
      [...routes.edges, ...http.edges, ...grpc.edges]
        .filter((e) => e.from)
        .map((e) => e.from),
    );
    const allNodes: GraphNodeDocument[] = [
      ...[...serviceIds].map((id) =>
        asNode({
          id,
          kind: 'service',
          name: id,
          path: 'docker-compose.yml',
          parser_id: 'compose',
        }),
      ),
      ...[...routes.nodes, ...http.nodes, ...grpc.nodes].map((n) =>
        asNode({
          id: n.id,
          kind: n.kind as GraphNodeDocument['kind'],
          name: n.name,
          path: n.path,
          parser_id: n.parser_id,
          language: n.language,
          parent_id: n.parent_id,
          metadata: n.metadata,
        }),
      ),
    ];
    const allEdges = [...routes.edges, ...http.edges, ...grpc.edges].map(
      (e) =>
        ({
          ...e,
          ingested_at: new Date().toISOString(),
          metadata: { layer: 'system', ...(e.metadata ?? {}) },
        }) as GraphEdgeDocument,
    );

    const focusId = [...serviceIds][0];
    expect(focusId).toBeTruthy();

    const slice = buildViewSlicePure({
      projectId: 'p-py',
      analysisRunId: 'r-py',
      allNodes,
      allEdges,
      focusId,
      layer: 'system',
      maxNodes: 200,
      maxEdges: 400,
    });

    expect(slice.nodes.some((n) => n.kind === 'http_endpoint')).toBe(true);
    expect(slice.edges.some((e) => e.type === 'http_calls' || e.type === 'exposes')).toBe(true);
  });
});
