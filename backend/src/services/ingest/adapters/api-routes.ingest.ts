import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import {
  httpEndpointNodeId,
  resolveApiRouteService,
} from '../api-routes-ids.js';
import { systemEdgeId, withSystemLayer } from '../system-layer.js';

export interface ApiRouteEntry {
  method: string;
  path: string;
  source_path: string;
  handler_name?: string | null;
  service_hint?: string | null;
  path_complete?: boolean;
  style?: string;
  route_kind?: string;
  framework?: string | null;
}

function normalizeRoutes(model: unknown): ApiRouteEntry[] {
  if (!model || typeof model !== 'object') {
    return [];
  }
  const routes = (model as { routes?: unknown }).routes;
  if (!Array.isArray(routes)) {
    return [];
  }
  return routes.filter(
    (entry): entry is ApiRouteEntry =>
      Boolean(entry && typeof entry === 'object' && entry.method && entry.path && entry.source_path),
  );
}

export function transformApiRoutes(
  model: unknown,
  ctx: IngestContext,
  language: string,
): IngestTransformResult {
  const nodes: IngestTransformResult['nodes'] = [];
  const edges: IngestTransformResult['edges'] = [];

  for (const route of normalizeRoutes(model)) {
    const method = String(route.method).toUpperCase();
    const httpPath = String(route.path);
    const sourcePath = String(route.source_path).replace(/\\/g, '/');
    const resolved = resolveApiRouteService({
      serviceHint: route.service_hint,
      sourcePath,
    });

    const endpointId = httpEndpointNodeId(
      ctx.parser_id,
      resolved.serviceStable,
      method,
      httpPath,
    );

    const metadata: Record<string, unknown> = {
      source: 'code',
      http_path: httpPath,
      http_method: method,
      path_complete: route.path_complete ?? true,
    };
    if (resolved.serviceName) {
      metadata.service_name = resolved.serviceName;
    }
    if (route.handler_name) {
      metadata.handler_name = route.handler_name;
      metadata.handler_path = sourcePath;
    }
    if (route.style) {
      metadata.style = route.style;
    }
    if (route.route_kind) {
      metadata.route_kind = route.route_kind;
    }
    if (route.framework) {
      metadata.framework = route.framework;
    }

    nodes.push({
      id: endpointId,
      project_id: ctx.project_id,
      analysis_run_id: ctx.analysis_run_id,
      parser_id: ctx.parser_id,
      kind: 'http_endpoint',
      name: httpPath,
      qualified_name: `${method} ${httpPath}`,
      language,
      path: sourcePath,
      signature: method,
      parent_id: resolved.serviceId,
      metadata: withSystemLayer(metadata),
    });

    if (resolved.serviceId) {
      edges.push({
        id: systemEdgeId(ctx.parser_id, 'exposes', resolved.serviceId, endpointId),
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        language: 'system',
        from: resolved.serviceId,
        to: endpointId,
        type: 'exposes',
        path: sourcePath,
        metadata: withSystemLayer({}),
      });
    }
  }

  return { nodes, edges };
}

export const tsApiRoutesIngestAdapter: IngestAdapter = {
  parser_id: 'ts-api-routes',
  supported_schema_versions: ['1'],
  transform(model, ctx) {
    return transformApiRoutes(model, ctx, 'typescript');
  },
};

export const dotnetApiRoutesIngestAdapter: IngestAdapter = {
  parser_id: 'dotnet-api-routes',
  supported_schema_versions: ['1'],
  transform(model, ctx) {
    return transformApiRoutes(model, ctx, 'csharp');
  },
};
