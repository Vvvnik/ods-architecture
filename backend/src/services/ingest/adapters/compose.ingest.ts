import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { composeServiceNodeId, composeServiceStableKey, systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

interface ComposeService {
  name: string;
  depends_on?: Array<{ service: string; condition?: string }>;
}

interface ComposeInfrastructure {
  service_name: string;
  infra_kind: string;
  image?: string;
}

interface ComposeFileModel {
  compose_file: string;
  services: ComposeService[];
  infrastructure?: ComposeInfrastructure[];
}

function normalizeComposeModels(model: unknown): ComposeFileModel[] {
  if (!model || typeof model !== 'object') {
    return [];
  }
  const record = model as Record<string, unknown>;
  if (Array.isArray(record.files)) {
    return record.files.filter((entry): entry is ComposeFileModel => Boolean(entry && typeof entry === 'object'));
  }
  if (Array.isArray(record.services)) {
    return [record as unknown as ComposeFileModel];
  }
  return [];
}

export const composeIngestAdapter: IngestAdapter = {
  parser_id: 'compose',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const serviceIds = new Map<string, string>();

    for (const fileModel of normalizeComposeModels(model)) {
      const composePath = fileModel.compose_file;

      for (const service of fileModel.services ?? []) {
        const stableKey = composeServiceStableKey(composePath, service.name);
        const nodeId = composeServiceNodeId(service.name, composePath);
        serviceIds.set(service.name.toLowerCase(), nodeId);
        serviceIds.set(service.name, nodeId);
        nodes.push({
          id: nodeId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'service',
          name: service.name,
          qualified_name: service.name,
          language: 'system',
          path: composePath,
          metadata: withSystemLayer({ compose_file: composePath }),
        });
      }

      for (const service of fileModel.services ?? []) {
        const nodeId =
          serviceIds.get(service.name.toLowerCase()) ??
          composeServiceNodeId(service.name, composePath);

        for (const dep of service.depends_on ?? []) {
          const targetId =
            serviceIds.get(dep.service.toLowerCase()) ?? serviceIds.get(dep.service);
          if (!targetId) {
            continue;
          }
          edges.push({
            id: systemEdgeId(ctx.parser_id, 'depends_on', nodeId, targetId),
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            language: 'system',
            from: nodeId,
            to: targetId,
            type: 'depends_on',
            path: composePath,
            metadata: withSystemLayer({}),
          });
        }
      }

      for (const infra of fileModel.infrastructure ?? []) {
        const kind =
          infra.infra_kind === 'database'
            ? 'database'
            : infra.infra_kind === 'broker'
              ? 'broker'
              : 'storage';
        const stableKey = `${composePath}#${infra.service_name}`;
        const infraId = systemNodeId(ctx.parser_id, kind, stableKey);
        nodes.push({
          id: infraId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind,
          name: infra.service_name,
          qualified_name: infra.service_name,
          language: 'system',
          path: composePath,
          metadata: withSystemLayer({ image: infra.image }),
        });

        const serviceId =
          serviceIds.get(infra.service_name.toLowerCase()) ?? serviceIds.get(infra.service_name);
        if (serviceId) {
          edges.push({
            id: systemEdgeId(ctx.parser_id, 'connects_to', serviceId, infraId),
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            language: 'system',
            from: serviceId,
            to: infraId,
            type: 'connects_to',
            path: composePath,
            metadata: withSystemLayer({}),
          });
        }
      }
    }

    return { nodes, edges };
  },
};
