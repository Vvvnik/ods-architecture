import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import {
  alignClientPathToFastifySplatRoute,
  httpEndpointNodeId,
  resolveApiRouteService,
} from '../api-routes-ids.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

/** Prefer code endpoint ids from 013 (not this parser_id). */
const CODE_ENDPOINT_PARSER = 'ts-api-routes';

export interface HttpCallEntry {
  method: string;
  path: string;
  source_path: string;
  service_hint?: string | null;
  callee_service_hint?: string | null;
}

function normalizeCalls(model: unknown): HttpCallEntry[] {
  if (!model || typeof model !== 'object') {
    return [];
  }
  const calls = (model as { calls?: unknown }).calls;
  if (!Array.isArray(calls)) {
    return [];
  }
  return calls.filter(
    (entry): entry is HttpCallEntry =>
      Boolean(entry && typeof entry === 'object' && entry.method && entry.path && entry.source_path),
  );
}

function openapiEndpointId(method: string, path: string): string {
  return systemNodeId('openapi', 'http_endpoint', `${method.toUpperCase()}:${path}`);
}

function resolveTargetEndpointId(options: {
  method: string;
  path: string;
  calleeHint: string | null;
  sourcePath: string;
}): { targetId: string; endpointPath: string } | null {
  const method = options.method.toUpperCase();
  const endpointPath = alignClientPathToFastifySplatRoute(options.path);
  const hint = (options.calleeHint?.trim() || 'backend').toLowerCase();

  const resolved = resolveApiRouteService({
    serviceHint: hint,
    sourcePath: options.sourcePath,
  });

  // Prefer stable code id (013). Fallback openapi id when no service resolve.
  if (resolved.serviceName) {
    return {
      targetId: httpEndpointNodeId(
        CODE_ENDPOINT_PARSER,
        resolved.serviceStable,
        method,
        endpointPath,
      ),
      endpointPath,
    };
  }

  if (endpointPath.startsWith('/')) {
    return {
      targetId: openapiEndpointId(method, endpointPath),
      endpointPath,
    };
  }

  return null;
}

export const tsHttpCallsIngestAdapter: IngestAdapter = {
  parser_id: 'ts-http-calls',
  supported_schema_versions: ['1'],
  transform(model, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];

    for (const call of normalizeCalls(model)) {
      const method = String(call.method).toUpperCase();
      const httpPath = String(call.path);
      const sourcePath = String(call.source_path).replace(/\\/g, '/');

      const caller = resolveApiRouteService({
        serviceHint: call.service_hint,
        sourcePath,
      });
      if (!caller.serviceId) {
        continue;
      }

      const target = resolveTargetEndpointId({
        method,
        path: httpPath,
        calleeHint: call.callee_service_hint ?? 'backend',
        sourcePath,
      });
      if (!target) {
        continue;
      }

      // Unique per call-site so incremental deleteByPaths cannot drop a shared
      // (service→endpoint) edge while another file still calls the same API.
      edges.push({
        id: systemEdgeId(
          ctx.parser_id,
          'http_calls',
          caller.serviceId,
          `${target.targetId}|${sourcePath}`,
        ),
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        language: 'system',
        from: caller.serviceId,
        to: target.targetId,
        type: 'http_calls',
        path: sourcePath,
        metadata: withSystemLayer({
          source: 'code',
          http_method: method,
          http_path: httpPath,
          endpoint_path: target.endpointPath,
        }),
      });
    }

    return { nodes, edges };
  },
};
