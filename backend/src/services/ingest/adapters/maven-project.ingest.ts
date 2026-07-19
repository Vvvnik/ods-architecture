import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { systemNodeId, withSystemLayer } from '../system-layer.js';
import {
  displaySpringServiceName,
  normalizeSpringServiceName,
  resolveComposeServiceIdFromHint,
} from '../maven-compose-merge.js';

interface MavenModule {
  path: string;
  group_id?: string | null;
  artifact_id: string;
  packaging?: string | null;
  is_boot_app: boolean;
  service_name_hint?: string | null;
  parent_artifact_id?: string | null;
}

function modules(model: unknown): MavenModule[] {
  const value = (model as { modules?: unknown } | null)?.modules;
  return Array.isArray(value)
    ? value.filter((entry): entry is MavenModule => Boolean(entry && typeof entry === 'object'))
    : [];
}

export const mavenProjectIngestAdapter: IngestAdapter = {
  parser_id: 'maven-project',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    for (const module of modules(model)) {
      if (!module.is_boot_app || !module.artifact_id) continue;
      const hint = module.service_name_hint || module.artifact_id;
      const composeId = resolveComposeServiceIdFromHint(hint, module.path);
      const displayName = displaySpringServiceName(hint);
      const id = composeId ?? systemNodeId(ctx.parser_id, 'service', module.artifact_id);
      nodes.push({
        id,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        kind: 'service',
        name: displayName,
        qualified_name: module.artifact_id,
        language: 'system',
        path: module.path,
        metadata: withSystemLayer({
          maven_group_id: module.group_id ?? undefined,
          maven_artifact_id: module.artifact_id,
          maven_packaging: module.packaging ?? 'jar',
          module_path: module.path,
          service_stable: normalizeSpringServiceName(hint),
          parent_artifact_id: module.parent_artifact_id ?? undefined,
        }),
      });
    }
    return { nodes, edges: [] };
  },
};
