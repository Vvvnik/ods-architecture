import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { resolveApiRouteService } from '../api-routes-ids.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

interface GrpcCall {
  source_path: string;
  service_hint?: string | null;
  target_service?: string | null;
  target_method?: string | null;
  method?: string | null;
}

function calls(model: unknown): GrpcCall[] {
  const value = (model as { calls?: unknown } | null)?.calls;
  return Array.isArray(value)
    ? value.filter((entry): entry is GrpcCall => Boolean(entry && typeof entry === 'object' && (entry as GrpcCall).source_path))
    : [];
}

function normalizeServiceName(value: string): string {
  const raw = value.trim();
  if (!raw) return raw;
  const withoutSuffix = raw.replace(/(Grpc|Client)$/i, '');
  return withoutSuffix;
}

function buildAdapter(parserId: 'ts-grpc-calls' | 'java-grpc-calls' | 'dotnet-grpc-calls'): IngestAdapter {
  return {
    parser_id: parserId,
    supported_schema_versions: ['1'],
    transform(model: unknown, ctx: IngestContext): IngestTransformResult {
      const edges: IngestTransformResult['edges'] = [];
      for (const call of calls(model)) {
        const sourcePath = call.source_path.replace(/\\/g, '/');
        const caller = resolveApiRouteService({
          serviceHint: call.service_hint,
          sourcePath,
        });
        if (!caller.serviceId) continue;
        const targetService =
          call.target_service && String(call.target_service).trim().length > 0
            ? normalizeServiceName(String(call.target_service))
            : null;
        const targetMethod =
          call.target_method && String(call.target_method).trim().length > 0
            ? String(call.target_method).replace(/Async$/, '')
            : null;
        const methodToken =
          targetService && targetMethod
            ? `${targetService}/${targetMethod}`
            : call.method && String(call.method).trim().length > 0
              ? String(call.method)
              : 'unknown';
        const targetId = systemNodeId('grpc-proto', 'grpc_method', methodToken);
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
            protocol: 'grpc',
            source: 'code',
          }),
        });
      }
      return { nodes: [], edges };
    },
  };
}

export const tsGrpcCallsIngestAdapter = buildAdapter('ts-grpc-calls');
export const javaGrpcCallsIngestAdapter = buildAdapter('java-grpc-calls');
export const dotnetGrpcCallsIngestAdapter = buildAdapter('dotnet-grpc-calls');
