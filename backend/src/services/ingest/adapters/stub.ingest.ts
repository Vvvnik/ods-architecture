/**
 * Native model schema_version=1 (parsers/stub):
 * { stub: true, file_count: number }
 * Узлы строятся из ctx.files_analyzed — по одному file-узлу на путь.
 */
import type { IngestAdapter, IngestContext, IngestTransformResult, GraphNodeInput } from '../types.js';
import { assignStableNodeIds } from '../node-id.js';

function languageFromPath(path: string): string {
  if (path.endsWith('.cs') || path.endsWith('.csproj')) {
    return 'csharp';
  }
  if (path.endsWith('.ts') || path.endsWith('.tsx')) {
    return 'typescript';
  }
  if (path.endsWith('.py')) {
    return 'python';
  }
  return 'unknown';
}

function fileName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] ?? path;
}

export const stubIngestAdapter: IngestAdapter = {
  parser_id: 'stub',
  supported_schema_versions: ['1'],

  transform(_model: unknown, ctx: IngestContext): IngestTransformResult {
    const paths = ctx.files_analyzed.length > 0 ? ctx.files_analyzed : [];

    const nodes: GraphNodeInput[] = paths.map((path) => ({
      project_id: ctx.project_id,
      analysis_run_id: ctx.analysis_run_id,
      parser_id: ctx.parser_id,
      kind: 'file',
      name: fileName(path),
      qualified_name: path,
      language: languageFromPath(path),
      path,
      location: null,
      parent_id: null,
      signature: null,
      metadata: { stub: true },
    }));

    return { nodes: assignStableNodeIds(nodes), edges: [] };
  },
};
