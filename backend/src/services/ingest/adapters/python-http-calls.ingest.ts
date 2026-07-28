import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { httpEndpointNodeId, resolveApiRouteService } from '../api-routes-ids.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

const CODE_ENDPOINT_PARSER = 'python-api-routes';
const CLIENT_KINDS = new Set(['httpx', 'requests', 'aiohttp', 'other']);

interface PythonHttpCall {
  method: string;
  path?: string | null;
  url?: string | null;
  source_path: string;
  client_kind?: string | null;
  service_hint?: string | null;
  callee_service_hint?: string | null;
}

function calls(model: unknown): PythonHttpCall[] {
  const value = (model as { calls?: unknown } | null)?.calls;
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is PythonHttpCall =>
          Boolean(
            entry &&
              typeof entry === 'object' &&
              (entry as PythonHttpCall).method &&
              (entry as PythonHttpCall).source_path &&
              ((entry as PythonHttpCall).path || (entry as PythonHttpCall).url),
          ),
      )
    : [];
}

function resolveCallPath(call: PythonHttpCall): string | null {
  if (call.path && String(call.path).trim()) {
    return String(call.path).trim();
  }
  const raw = call.url ? String(call.url).trim() : '';
  if (!raw) return null;
  try {
    if (raw.startsWith('/')) return raw;
    const parsed = new URL(raw);
    return parsed.pathname || raw;
  } catch {
    return raw.startsWith('/') ? raw : null;
  }
}

export const pythonHttpCallsIngestAdapter: IngestAdapter = {
  parser_id: 'python-http-calls',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];

    for (const call of calls(model)) {
      const clientKind = (call.client_kind ?? 'other').toLowerCase();
      if (!CLIENT_KINDS.has(clientKind)) continue;

      const sourcePath = call.source_path.replace(/\\/g, '/');
      const caller = resolveApiRouteService({
        serviceHint: call.service_hint,
        sourcePath,
      });
      if (!caller.serviceId) continue;

      const callPath = resolveCallPath(call);
      if (!callPath) continue;

      const method = String(call.method).toUpperCase();

      if (call.callee_service_hint) {
        const callee = resolveApiRouteService({
          serviceHint: call.callee_service_hint,
          sourcePath,
          composeFile: caller.composeFile,
        });
        if (callee.serviceName) {
          const targetId = httpEndpointNodeId(
            CODE_ENDPOINT_PARSER,
            callee.serviceStable,
            method,
            callPath,
          );
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
              client_kind: clientKind,
              http_method: method,
              http_path: callPath,
              protocol: 'http',
            }),
          });
          continue;
        }
      }

      const absolute = call.url && /^https?:\/\//i.test(String(call.url));
      if (!absolute && !callPath.startsWith('/')) continue;

      const externalKey = absolute ? String(call.url) : `${method}:${callPath}`;
      const externalId = systemNodeId(ctx.parser_id, 'external_api', externalKey);
      nodes.push({
        id: externalId,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        kind: 'external_api',
        name: callPath,
        qualified_name: `${method} ${callPath}`,
        language: 'python',
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
          client_kind: clientKind,
          http_method: method,
          http_path: callPath,
          protocol: 'http',
        }),
      });
    }

    return { nodes, edges };
  },
};
