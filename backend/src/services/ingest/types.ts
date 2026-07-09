import type { EdgeType, GraphEdgeDocument } from '../../domain/graph-edge.js';
import type { NodeKind, GraphNodeDocument } from '../../domain/graph-node.js';

export interface IngestContext {
  project_id: string;
  analysis_run_id: string;
  parser_id: string;
  schema_version: string;
  files_analyzed: string[];
  incremental: boolean;
  affected_paths: string[];
  deleted_paths: string[];
}

export type GraphNodeInput = Omit<GraphNodeDocument, 'id' | 'ingested_at'> & {
  id?: string;
};

export type GraphEdgeInput = Omit<GraphEdgeDocument, 'id' | 'ingested_at'> & {
  id?: string;
};

export interface IngestTransformResult {
  nodes: GraphNodeInput[];
  edges: GraphEdgeInput[];
}

export interface IngestAdapter {
  readonly parser_id: string;
  readonly supported_schema_versions: string[];
  transform(model: unknown, ctx: IngestContext): IngestTransformResult;
}

export function isNodeKind(value: string): value is NodeKind {
  return [
    'file',
    'module',
    'namespace',
    'class',
    'interface',
    'function',
    'method',
    'property',
    'field',
    'variable',
    'enum',
  ].includes(value);
}

export function isEdgeType(value: string): value is EdgeType {
  return [
    'imports',
    'exports',
    'calls',
    'inherits',
    'implements',
    'references',
    'contains',
  ].includes(value);
}
