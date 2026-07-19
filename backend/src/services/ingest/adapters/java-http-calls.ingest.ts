import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { httpEndpointNodeId, resolveApiRouteService } from '../api-routes-ids.js';
import { systemEdgeId, withSystemLayer } from '../system-layer.js';

const CODE_ENDPOINT_PARSER = 'java-api-routes';

interface JavaHttpCall {
  method: string;
  path: string;
  source_path: string;
  client_kind: 'feign' | 'webclient';
  service_hint?: string | null;
  callee_service_hint?: string | null;
}

function calls(model: unknown): JavaHttpCall[] {
  const value = (model as { calls?: unknown } | null)?.calls;
  return Array.isArray(value)
    ? value.filter((entry): entry is JavaHttpCall =>
      Boolean(entry && typeof entry === 'object' && (entry as JavaHttpCall).method && (entry as JavaHttpCall).path))
    : [];
}

export const javaHttpCallsIngestAdapter: IngestAdapter = {
  parser_id: 'java-http-calls',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const edges: IngestTransformResult['edges'] = [];
    for (const call of calls(model)) {
      if (!call.source_path || !['feign', 'webclient', 'restclient'].includes(call.client_kind)) continue;
      const sourcePath = call.source_path.replace(/\\/g, '/');
      const caller = resolveApiRouteService({ serviceHint: call.service_hint, sourcePath });
      if (!caller.serviceId || !call.callee_service_hint) continue;
      const callee = resolveApiRouteService({
        serviceHint: call.callee_service_hint,
        sourcePath,
        composeFile: caller.composeFile,
      });
      if (!callee.serviceName) continue;
      const method = call.method.toUpperCase();
      const targetId = httpEndpointNodeId(CODE_ENDPOINT_PARSER, callee.serviceStable, method, call.path);
      edges.push({
        id: systemEdgeId(ctx.parser_id, 'http_calls', caller.serviceId, `${targetId}|${sourcePath}`),
        project_id: ctx.project_id, analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id, language: 'system', from: caller.serviceId, to: targetId,
        type: 'http_calls', path: sourcePath,
        metadata: withSystemLayer({
          source: 'code', client_kind: call.client_kind,
          http_method: method, http_path: call.path,
        }),
      });
    }
    return { nodes: [], edges };
  },
};
