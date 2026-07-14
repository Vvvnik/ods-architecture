import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { systemEdgeId, systemNodeId, withSystemLayer } from '../system-layer.js';

interface DotnetProjectReference {
  path?: string;
  name?: string;
}

interface DotnetProject {
  path: string;
  name: string;
  project_type?: string;
  service_folder_hint?: string;
  references?: DotnetProjectReference[];
  package_references?: string[];
}

interface DotnetProjectModel {
  projects?: DotnetProject[];
}

function normalizeDotnetProjectModel(model: unknown): DotnetProject[] {
  if (!model || typeof model !== 'object') {
    return [];
  }
  const record = model as DotnetProjectModel;
  if (!Array.isArray(record.projects)) {
    return [];
  }
  return record.projects.filter(
    (entry): entry is DotnetProject =>
      Boolean(entry && typeof entry === 'object' && typeof entry.path === 'string' && typeof entry.name === 'string'),
  );
}

export const dotnetProjectIngestAdapter: IngestAdapter = {
  parser_id: 'dotnet-project',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const projects = normalizeDotnetProjectModel(model);
    const projectIdsByPath = new Map<string, string>();
    const projectIdsByName = new Map<string, string>();

    for (const project of projects) {
      const nodeId = systemNodeId(ctx.parser_id, 'dotnet_project', project.path);
      projectIdsByPath.set(project.path, nodeId);
      projectIdsByName.set(project.name, nodeId);

      nodes.push({
        id: nodeId,
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        kind: 'dotnet_project',
        name: project.name,
        qualified_name: project.path,
        language: 'csharp',
        path: project.path,
        metadata: withSystemLayer({
          project_type: project.project_type,
          service_folder_hint: project.service_folder_hint,
          package_references: project.package_references,
        }),
      });
    }

    for (const project of projects) {
      const fromId = projectIdsByPath.get(project.path);
      if (!fromId) {
        continue;
      }

      for (const reference of project.references ?? []) {
        const targetId =
          (reference.path ? projectIdsByPath.get(reference.path) : undefined) ??
          (reference.name ? projectIdsByName.get(reference.name) : undefined);
        if (!targetId) {
          continue;
        }

        edges.push({
          id: systemEdgeId(ctx.parser_id, 'project_reference', fromId, targetId),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: fromId,
          to: targetId,
          type: 'project_reference',
          path: project.path,
          metadata: withSystemLayer({
            reference_path: reference.path,
            reference_name: reference.name,
          }),
        });
      }
    }

    return { nodes, edges };
  },
};
