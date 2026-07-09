import type { GraphNodeInput } from './types.js';

export function buildNodeId(parts: {
  parser_id: string;
  path: string;
  kind: string;
  qualified_name: string;
  start_line?: number;
}): string {
  const base = `${parts.parser_id}:${parts.path}:${parts.kind}:${parts.qualified_name}`;
  if (parts.start_line !== undefined) {
    return `${base}:line:${parts.start_line}`;
  }
  return base;
}

export function buildEdgeId(parts: {
  parser_id: string;
  path: string;
  type: string;
  from: string;
  to: string;
}): string {
  return `${parts.parser_id}:${parts.path}:${parts.type}:${parts.from}:${parts.to}`;
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
