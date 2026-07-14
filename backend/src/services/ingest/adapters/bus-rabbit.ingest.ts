import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { ensureMessageTypeNode, ensureMessageTopicNode } from '../bus-ingest.helpers.js';
import {
  resolveComposeServiceIdFromHint,
  systemEdgeId,
  withSystemLayer,
} from '../system-layer.js';

interface BusRabbitHandler {
  path: string;
  listener_class?: string;
  handler_method?: string;
  role: string;
  message_type: string;
  queue_hint?: string;
  exchange_hint?: string;
}

interface BusRabbitModel {
  service_hint?: string;
  handlers?: BusRabbitHandler[];
}

function normalizeBusRabbitModel(model: unknown): BusRabbitModel {
  if (!model || typeof model !== 'object') {
    return { handlers: [] };
  }
  return model as BusRabbitModel;
}

export const busRabbitIngestAdapter: IngestAdapter = {
  parser_id: 'bus-rabbit',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const messageTypeIds = new Map<string, string>();
    const messageTopicIds = new Map<string, string>();
    const parsed = normalizeBusRabbitModel(model);

    for (const handler of parsed.handlers ?? []) {
      const fromId = resolveComposeServiceIdFromHint(parsed.service_hint, handler.path);
      if (!fromId) {
        continue;
      }

      const messageTypeId = ensureMessageTypeNode(
        nodes,
        messageTypeIds,
        ctx,
        handler.message_type,
        handler.path,
        'rabbit',
      );

      const edgeType =
        handler.role === 'producer'
          ? 'publishes'
          : handler.role === 'rpc_handler'
            ? 'rpc_handles'
            : 'consumes';

      edges.push({
        id: systemEdgeId(ctx.parser_id, edgeType, fromId, messageTypeId),
        project_id: ctx.project_id,
        analysis_run_id: ctx.analysis_run_id,
        parser_id: ctx.parser_id,
        language: 'system',
        from: fromId,
        to: messageTypeId,
        type: edgeType,
        path: handler.path,
        metadata: withSystemLayer({
          listener_class: handler.listener_class,
          handler_method: handler.handler_method,
          role: handler.role,
        }),
      });

      const topicHint = handler.queue_hint ?? handler.exchange_hint;
      if (topicHint) {
        const topicId = ensureMessageTopicNode(
          nodes,
          messageTopicIds,
          ctx,
          topicHint,
          handler.path,
          'rabbit',
        );
        edges.push({
          id: systemEdgeId(ctx.parser_id, edgeType, fromId, topicId),
          project_id: ctx.project_id,
          analysis_run_id: ctx.analysis_run_id,
          parser_id: ctx.parser_id,
          language: 'system',
          from: fromId,
          to: topicId,
          type: edgeType,
          path: handler.path,
          metadata: withSystemLayer({ role: handler.role }),
        });
      }
    }

    return { nodes, edges };
  },
};
