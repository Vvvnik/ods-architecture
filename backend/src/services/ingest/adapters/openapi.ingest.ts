import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { findMatchingCodeHttpEndpoint } from '../openapi-code-merge.js';
import {
  resolveComposeServiceIdFromHint,
  systemEdgeId,
  systemNodeId,
  withSystemLayer,
} from '../system-layer.js';

interface OpenApiEndpoint {
  method: string;
  path: string;
  operation_id?: string;
  summary?: string;
  tags?: string[];
}

interface OpenApiSpec {
  path: string;
  title?: string;
  service_hint?: string;
  endpoints?: OpenApiEndpoint[];
}

interface OpenApiModel {
  specs?: OpenApiSpec[];
}

function normalizeOpenApiModel(model: unknown): OpenApiSpec[] {
  if (!model || typeof model !== 'object') {
    return [];
  }
  const record = model as OpenApiModel;
  return (record.specs ?? []).filter((entry): entry is OpenApiSpec => Boolean(entry && typeof entry === 'object'));
}

function endpointStableKey(method: string, path: string): string {
  return `${method.toUpperCase()}:${path}`;
}

const INVALID_COMPOSE_SERVICE_HINTS = new Set(['src', 'config', 'configs', 'settings', 'contracts']);

function isValidComposeServiceHint(serviceHint: string | undefined): boolean {
  return Boolean(serviceHint && !INVALID_COMPOSE_SERVICE_HINTS.has(serviceHint.toLowerCase()));
}

function serviceNameInPath(specPath: string, serviceName: string): boolean {
  const normalizedPath = specPath.replace(/\\/g, '/').toLowerCase();
  const normalizedName = serviceName.toLowerCase();
  return normalizedPath.includes(normalizedName);
}

export const openapiIngestAdapter: IngestAdapter = {
  parser_id: 'openapi',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const codeEndpoints = ctx.code_http_endpoints ?? [];

    for (const spec of normalizeOpenApiModel(model)) {
      const specNodeId = systemNodeId(ctx.parser_id, 'external_api', spec.path);
      nodes.push({
        id: specNodeId,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        kind: 'external_api',
        name: spec.title ?? spec.path.split('/').pop() ?? spec.path,
        qualified_name: spec.title ?? spec.path,
        language: 'yaml',
        path: spec.path,
        metadata: withSystemLayer({ service_hint: spec.service_hint }),
      });

      const serviceId = isValidComposeServiceHint(spec.service_hint)
        ? resolveComposeServiceIdFromHint(spec.service_hint, spec.path)
        : null;
      const exposeService =
        Boolean(
          serviceId &&
            spec.service_hint &&
            serviceNameInPath(spec.path, spec.service_hint),
        );

      for (const endpoint of spec.endpoints ?? []) {
        const method = endpoint.method.toUpperCase();
        const matched = findMatchingCodeHttpEndpoint(
          codeEndpoints,
          method,
          endpoint.path,
          spec.service_hint,
        );

        if (matched) {
          edges.push({
            id: systemEdgeId(ctx.parser_id, 'documents', specNodeId, matched.id),
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            language: 'system',
            from: specNodeId,
            to: matched.id,
            type: 'documents',
            path: spec.path,
            metadata: withSystemLayer({
              merged_with_code: true,
              operation_id: endpoint.operation_id,
              summary: endpoint.summary,
              tags: endpoint.tags,
            }),
          });
          // Code already owns exposes; do not emit a parallel OpenAPI endpoint.
          continue;
        }

        const stableKey = endpointStableKey(endpoint.method, endpoint.path);
        const endpointId = systemNodeId(ctx.parser_id, 'http_endpoint', stableKey);

        nodes.push({
          id: endpointId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'http_endpoint',
          name: endpoint.path,
          qualified_name: `${method} ${endpoint.path}`,
          language: 'yaml',
          path: spec.path,
          signature: method,
          metadata: withSystemLayer({
            source: 'openapi',
            operation_id: endpoint.operation_id,
            summary: endpoint.summary,
            tags: endpoint.tags,
            http_method: method,
            http_path: endpoint.path,
          }),
        });

        edges.push({
          id: systemEdgeId(ctx.parser_id, 'documents', specNodeId, endpointId),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: specNodeId,
          to: endpointId,
          type: 'documents',
          path: spec.path,
          metadata: withSystemLayer({}),
        });

        if (exposeService && serviceId) {
          edges.push({
            id: systemEdgeId(ctx.parser_id, 'exposes', serviceId, endpointId),
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            language: 'system',
            from: serviceId,
            to: endpointId,
            type: 'exposes',
            path: spec.path,
            metadata: withSystemLayer({}),
          });
        }
      }
    }

    return { nodes, edges };
  },
};
