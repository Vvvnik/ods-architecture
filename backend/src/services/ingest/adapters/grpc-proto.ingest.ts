import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { resolveApiRouteService } from '../api-routes-ids.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

interface GrpcProtoService {
  source_path: string;
  package?: string;
  name: string;
  service_hint?: string | null;
  methods?: Array<{
    name: string;
    client_streaming?: boolean;
    server_streaming?: boolean;
  }>;
}

function services(model: unknown): GrpcProtoService[] {
  const value = (model as { services?: unknown } | null)?.services;
  return Array.isArray(value)
    ? value.filter(
      (entry): entry is GrpcProtoService =>
        Boolean(entry && typeof entry === 'object' && (entry as GrpcProtoService).source_path && (entry as GrpcProtoService).name),
    )
    : [];
}

export const grpcProtoIngestAdapter: IngestAdapter = {
  parser_id: 'grpc-proto',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];

    for (const service of services(model)) {
      const sourcePath = service.source_path.replace(/\\/g, '/');
      const serviceName = service.package ? `${service.package}.${service.name}` : service.name;
      const externalContractId = systemNodeId(ctx.parser_id, 'external_api', sourcePath);
      nodes.push({
        id: externalContractId,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        kind: 'external_api',
        name: sourcePath.split('/').pop() ?? sourcePath,
        qualified_name: sourcePath,
        language: 'proto',
        path: sourcePath,
        metadata: withSystemLayer({ protocol: 'grpc' }),
      });
      const serviceResolved = resolveApiRouteService({
        serviceHint: service.service_hint ?? service.name,
        sourcePath,
      });
      for (const method of service.methods ?? []) {
        const methodStable = `${service.name}/${method.name}`;
        const methodId = systemNodeId(
          ctx.parser_id,
          'grpc_method',
          methodStable,
        );
        nodes.push({
          id: methodId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'grpc_method',
          name: method.name,
          qualified_name: `${serviceName}/${method.name}`,
          language: 'proto',
          path: sourcePath,
          metadata: withSystemLayer({
            protocol: 'grpc',
            grpc_service: serviceName,
            grpc_method: method.name,
            client_streaming: Boolean(method.client_streaming),
            server_streaming: Boolean(method.server_streaming),
          }),
        });
        edges.push({
          id: systemEdgeId(ctx.parser_id, 'documents', externalContractId, methodId),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: externalContractId,
          to: methodId,
          type: 'documents',
          path: sourcePath,
          metadata: withSystemLayer({ protocol: 'grpc' }),
        });

        if (serviceResolved.serviceId) {
          edges.push({
            id: systemEdgeId(ctx.parser_id, 'exposes', serviceResolved.serviceId, methodId),
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            language: 'system',
            from: serviceResolved.serviceId,
            to: methodId,
            type: 'exposes',
            path: sourcePath,
            metadata: withSystemLayer({ protocol: 'grpc' }),
          });
        }
      }
    }
    return { nodes, edges };
  },
};
