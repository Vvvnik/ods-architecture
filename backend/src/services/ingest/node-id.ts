import { createHash } from 'node:crypto';

import type { GraphNodeInput } from './types.js';

/** Elasticsearch rejects `_id` longer than 512 bytes. */
export const ES_DOCUMENT_ID_MAX_BYTES = 512;

/** UUID analysis_run_id length (36) + separator `:`. */
export const ES_RUN_ID_PREFIX_BYTES = 37;

/**
 * Max UTF-8 byte length for the logical graph id (`node.id` / `edge.id`) so that
 * ES `_id` = `{analysis_run_id}:{logicalId}` stays within 512 bytes.
 */
export const MAX_LOGICAL_GRAPH_ID_BYTES = ES_DOCUMENT_ID_MAX_BYTES - ES_RUN_ID_PREFIX_BYTES;

export function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

/**
 * Keep human-readable ids when short; otherwise replace with a stable hash form
 * `{head}:h:{sha256hex40}` so upserts and edge links remain deterministic.
 */
export function fitLogicalIdForEs(logicalId: string): string {
  if (utf8ByteLength(logicalId) <= MAX_LOGICAL_GRAPH_ID_BYTES) {
    return logicalId;
  }

  const hash = createHash('sha256').update(logicalId, 'utf8').digest('hex').slice(0, 40);
  const head = logicalId.split(':')[0] || 'id';
  const compact = `${head}:h:${hash}`;
  if (utf8ByteLength(compact) <= MAX_LOGICAL_GRAPH_ID_BYTES) {
    return compact;
  }
  return `h:${hash}`;
}

export function buildNodeId(parts: {
  parser_id: string;
  path: string;
  kind: string;
  qualified_name: string;
  start_line?: number;
}): string {
  const base = `${parts.parser_id}:${parts.path}:${parts.kind}:${parts.qualified_name}`;
  const full =
    parts.start_line !== undefined ? `${base}:line:${parts.start_line}` : base;
  return fitLogicalIdForEs(full);
}

export function buildEdgeId(parts: {
  parser_id: string;
  path: string;
  type: string;
  from: string;
  to: string;
}): string {
  return fitLogicalIdForEs(
    `${parts.parser_id}:${parts.path}:${parts.type}:${parts.from}:${parts.to}`,
  );
}

export function assignStableNodeIds(nodes: GraphNodeInput[]): GraphNodeInput[] {
  const seen = new Map<string, number>();
  const result: GraphNodeInput[] = [];

  for (const node of nodes) {
    const qualifiedName = node.qualified_name ?? node.name;
    let id = buildNodeId({
      parser_id: node.parser_id,
      path: node.path,
      kind: node.kind,
      qualified_name: qualifiedName,
    });

    const count = seen.get(id) ?? 0;
    if (count > 0) {
      const startLine = node.location?.start_line;
      id = buildNodeId({
        parser_id: node.parser_id,
        path: node.path,
        kind: node.kind,
        qualified_name: qualifiedName,
        start_line: startLine ?? count,
      });
    }

    seen.set(id, (seen.get(id) ?? 0) + 1);
    result.push({ ...node, id });
  }

  return result;
}
