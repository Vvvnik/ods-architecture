import type { IngestContext, IngestTransformResult } from './types.js';
import { systemNodeId, withSystemLayer } from './system-layer.js';

export function ensureMessageTypeNode(
  nodes: IngestTransformResult['nodes'],
  knownIds: Map<string, string>,
  ctx: IngestContext,
  messageType: string,
  sourcePath: string,
  bus: 'rabbit' | 'kafka',
): string {
  const existing = knownIds.get(messageType);
  if (existing) {
    return existing;
  }
  const nodeId = systemNodeId(ctx.parser_id, 'message_type', messageType);
  knownIds.set(messageType, nodeId);
  nodes.push({
    id: nodeId,
    project_id: ctx.project_id,
    analysis_run_id: ctx.analysis_run_id,
    parser_id: ctx.parser_id,
    kind: 'message_type',
    name: messageType,
    qualified_name: messageType,
    language: 'csharp',
    path: sourcePath,
    metadata: withSystemLayer({ bus }),
  });
  return nodeId;
}

export function ensureMessageTopicNode(
  nodes: IngestTransformResult['nodes'],
  knownIds: Map<string, string>,
  ctx: IngestContext,
  topicName: string,
  sourcePath: string,
  bus: 'rabbit' | 'kafka',
): string {
  const existing = knownIds.get(topicName);
  if (existing) {
    return existing;
  }
  const nodeId = systemNodeId(ctx.parser_id, 'message_topic', topicName);
  knownIds.set(topicName, nodeId);
  nodes.push({
    id: nodeId,
    project_id: ctx.project_id,
    analysis_run_id: ctx.analysis_run_id,
    parser_id: ctx.parser_id,
    kind: 'message_topic',
    name: topicName,
    qualified_name: topicName,
    language: 'csharp',
    path: sourcePath,
    metadata: withSystemLayer({ bus }),
  });
  return nodeId;
}
