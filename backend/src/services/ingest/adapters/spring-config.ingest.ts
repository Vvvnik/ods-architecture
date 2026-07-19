import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { resolveComposeServiceIdFromHint, displaySpringServiceName } from '../maven-compose-merge.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

interface SpringConfig {
  source_path: string;
  service_hint?: string | null;
  port?: number | null;
  datasources?: Array<{ name?: string | null; jdbc_url?: string | null; engine?: string | null }>;
}

function configs(model: unknown): SpringConfig[] {
  const value = (model as { configs?: unknown } | null)?.configs;
  return Array.isArray(value)
    ? value.filter((entry): entry is SpringConfig => Boolean(entry && typeof entry === 'object'))
    : [];
}

export const springConfigIngestAdapter: IngestAdapter = {
  parser_id: 'spring-config',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const seenDatabases = new Set<string>();
    for (const config of configs(model)) {
      const serviceId = resolveComposeServiceIdFromHint(config.service_hint, config.source_path);
      if (serviceId && Number.isInteger(config.port)) {
        const displayName = displaySpringServiceName(config.service_hint ?? 'service');
        nodes.push({
          id: serviceId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'service',
          name: displayName,
          qualified_name: displayName,
          language: 'system',
          path: config.source_path,
          metadata: withSystemLayer({ port: config.port }),
        });
      }
      for (const datasource of config.datasources ?? []) {
        if (!serviceId || !datasource.engine || !datasource.jdbc_url || /\$\{|@\w+@/.test(datasource.jdbc_url)) continue;
        const stable = `${datasource.engine}:${datasource.name || 'default'}`;
        const databaseId = systemNodeId(ctx.parser_id, 'database', stable);
        if (!seenDatabases.has(databaseId)) {
          seenDatabases.add(databaseId);
          nodes.push({
            id: databaseId, project_id: ctx.project_id, analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id, kind: 'database', name: datasource.name || datasource.engine,
            qualified_name: stable, language: 'yaml', path: config.source_path,
            metadata: withSystemLayer({ engine: datasource.engine }),
          });
        }
        edges.push({
          id: systemEdgeId(ctx.parser_id, 'connects_to', serviceId, databaseId),
          project_id: ctx.project_id, analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id, language: 'system', from: serviceId, to: databaseId,
          type: 'connects_to', path: config.source_path,
          metadata: withSystemLayer({ engine: datasource.engine }),
        });
      }
    }
    return { nodes, edges };
  },
};
