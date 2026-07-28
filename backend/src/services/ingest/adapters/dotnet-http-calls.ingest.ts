import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { httpEndpointNodeId, resolveApiRouteService } from '../api-routes-ids.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

interface DotnetHttpCall {
  method: string;
  path: string;
  source_path: string;
  client_kind?: string;
  service_hint?: string | null;
  callee_service_hint?: string | null;
}

function calls(model: unknown): DotnetHttpCall[] {
  const value = (model as { calls?: unknown } | null)?.calls;
  return Array.isArray(value)
    ? value.filter(
      (entry): entry is DotnetHttpCall =>
        Boolean(entry && typeof entry === 'object' && (entry as DotnetHttpCall).method && (entry as DotnetHttpCall).path && (entry as DotnetHttpCall).source_path),
    )
    : [];
}

export const dotnetHttpCallsIngestAdapter: IngestAdapter = {
  parser_id: 'dotnet-http-calls',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    for (const call of calls(model)) {
      const sourcePath = call.source_path.replace(/\\/g, '/');
      const caller = resolveApiRouteService({ serviceHint: call.service_hint, sourcePath });
      if (!caller.serviceId) continue;
      const method = String(call.method).toUpperCase();
      const callPath = String(call.path);
      if (!call.callee_service_hint) {
        const externalId = systemNodeId(ctx.parser_id, 'external_api', `${method}:${callPath}`);
        nodes.push({
          id: externalId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'external_api',
          name: callPath,
          qualified_name: `${method} ${callPath}`,
          language: 'csharp',
          path: sourcePath,
          metadata: withSystemLayer({ protocol: 'http', source: 'code' }),
        });
        edges.push({
          id: systemEdgeId(ctx.parser_id, 'http_calls', caller.serviceId, `${externalId}|${sourcePath}`),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: caller.serviceId,
          to: externalId,
          type: 'http_calls',
          path: sourcePath,
          metadata: withSystemLayer({
            source: 'code',
            http_method: method,
            http_path: callPath,
            client_kind: call.client_kind ?? 'httpclient',
            protocol: 'http',
          }),
        });
        continue;
      }
      const callee = resolveApiRouteService({
        serviceHint: call.callee_service_hint,
        sourcePath,
        composeFile: caller.composeFile,
      });
      if (!callee.serviceName) {
        const externalId = systemNodeId(ctx.parser_id, 'external_api', `${method}:${callPath}`);
        nodes.push({
          id: externalId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'external_api',
          name: callPath,
          qualified_name: `${method} ${callPath}`,
          language: 'csharp',
          path: sourcePath,
          metadata: withSystemLayer({ protocol: 'http', source: 'code' }),
        });
        edges.push({
          id: systemEdgeId(ctx.parser_id, 'http_calls', caller.serviceId, `${externalId}|${sourcePath}`),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: caller.serviceId,
          to: externalId,
          type: 'http_calls',
          path: sourcePath,
          metadata: withSystemLayer({
            source: 'code',
            http_method: method,
            http_path: callPath,
            client_kind: call.client_kind ?? 'httpclient',
            protocol: 'http',
          }),
        });
        continue;
      }
      const targetId = httpEndpointNodeId('dotnet-api-routes', callee.serviceStable, method, callPath);
      edges.push({
        id: systemEdgeId(ctx.parser_id, 'http_calls', caller.serviceId, `${targetId}|${sourcePath}`),
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        language: 'system',
        from: caller.serviceId,
        to: targetId,
        type: 'http_calls',
        path: sourcePath,
        metadata: withSystemLayer({
          source: 'code',
          http_method: method,
          http_path: callPath,
          client_kind: call.client_kind ?? 'httpclient',
          protocol: 'http',
        }),
      });
    }
    return { nodes, edges };
  },
};
