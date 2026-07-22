import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { inferComposeFile } from '../api-routes-ids.js';
import {
  displaySpringServiceName,
  resolveComposeServiceNameFromHint,
} from '../maven-compose-merge.js';
import { composeServiceNodeId, systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

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

function resolveServiceId(
  hint: string | null | undefined,
  sourcePath: string,
  candidates: string[] | undefined,
): { serviceId: string; displayName: string } | null {
  if (!hint) return null;
  const matched = resolveComposeServiceNameFromHint(hint, candidates);
  const composeFile = inferComposeFile(sourcePath);
  if (matched) {
    return {
      serviceId: composeServiceNodeId(matched, composeFile),
      displayName: matched,
    };
  }
  if (candidates && candidates.length > 0) {
    return null;
  }
  const displayName = displaySpringServiceName(hint);
  return {
    serviceId: composeServiceNodeId(displayName, composeFile),
    displayName,
  };
}

export const springConfigIngestAdapter: IngestAdapter = {
  parser_id: 'spring-config',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const seenDatabases = new Set<string>();
    const candidates = ctx.compose_service_names;

    for (const config of configs(model)) {
      const resolved = resolveServiceId(config.service_hint, config.source_path, candidates);
      const serviceId = resolved?.serviceId ?? null;

      if (serviceId && resolved && Number.isInteger(config.port)) {
        // Enrich only: keep compose display name; metadata carries port.
        nodes.push({
          id: serviceId,
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          kind: 'service',
          name: resolved.displayName,
          qualified_name: resolved.displayName,
          language: 'system',
          path: config.source_path,
          metadata: withSystemLayer({ port: config.port }),
        });
      }

      for (const datasource of config.datasources ?? []) {
        if (!serviceId || !datasource.engine || !datasource.jdbc_url || /\$\{|@\w+@/.test(datasource.jdbc_url)) {
          continue;
        }
        const stable = `${datasource.engine}:${datasource.name || 'default'}`;
        const databaseId = systemNodeId(ctx.parser_id, 'database', stable);
        if (!seenDatabases.has(databaseId)) {
          seenDatabases.add(databaseId);
          nodes.push({
            id: databaseId,
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            kind: 'database',
            name: datasource.name || datasource.engine,
            qualified_name: stable,
            language: 'yaml',
            path: config.source_path,
            metadata: withSystemLayer({ engine: datasource.engine }),
          });
        }
        edges.push({
          id: systemEdgeId(ctx.parser_id, 'connects_to', serviceId, databaseId),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: serviceId,
          to: databaseId,
          type: 'connects_to',
          path: config.source_path,
          metadata: withSystemLayer({ engine: datasource.engine }),
        });
      }
    }
    return { nodes, edges };
  },
};
