import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { inferComposeFile } from '../api-routes-ids.js';
import { composeServiceNodeId, systemNodeId, withSystemLayer } from '../system-layer.js';
import {
  displaySpringServiceName,
  normalizeSpringServiceName,
  resolveComposeServiceNameFromHint,
} from '../maven-compose-merge.js';

interface GradleModule {
  path: string;
  group_id?: string | null;
  artifact_id: string;
  packaging?: string | null;
  is_boot_app: boolean;
  service_name_hint?: string | null;
  parent_artifact_id?: string | null;
  build_file?: string | null;
}

function modules(model: unknown): GradleModule[] {
  const value = (model as { modules?: unknown } | null)?.modules;
  return Array.isArray(value)
    ? value.filter((entry): entry is GradleModule => Boolean(entry && typeof entry === 'object'))
    : [];
}

export const gradleProjectIngestAdapter: IngestAdapter = {
  parser_id: 'gradle-project',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const candidates = ctx.compose_service_names;
    for (const module of modules(model)) {
      if (!module.is_boot_app || !module.artifact_id) continue;
      const hint = module.service_name_hint || module.artifact_id;
      const matchedComposeName = resolveComposeServiceNameFromHint(hint, candidates);
      const composeFile = inferComposeFile(module.path);

      let id: string;
      let name: string;
      if (matchedComposeName) {
        id = composeServiceNodeId(matchedComposeName, composeFile);
        name = matchedComposeName;
      } else if (candidates && candidates.length > 0) {
        id = systemNodeId(ctx.parser_id, 'service', module.artifact_id);
        name = displaySpringServiceName(hint);
      } else {
        id = composeServiceNodeId(displaySpringServiceName(hint), composeFile);
        name = displaySpringServiceName(hint);
      }

      nodes.push({
        id,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        kind: 'service',
        name,
        qualified_name: module.artifact_id,
        language: 'system',
        path: module.path,
        metadata: withSystemLayer({
          gradle_group_id: module.group_id ?? undefined,
          gradle_artifact_id: module.artifact_id,
          gradle_build_file: module.build_file ?? undefined,
          module_path: module.path,
          service_stable: normalizeSpringServiceName(hint),
          parent_artifact_id: module.parent_artifact_id ?? undefined,
        }),
      });
    }
    return { nodes, edges: [] };
  },
};
