import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import { ensureMessageTypeNode, ensureMessageTopicNode } from '../bus-ingest.helpers.js';
import {
  resolveComposeServiceIdFromHint,
  systemEdgeId,
  withSystemLayer,
} from '../system-layer.js';

interface BusKafkaHandler {
  path: string;
  class_name?: string;
  role: string;
  topic?: string;
  topic_config_key?: string;
  message_type?: string;
  group_id?: string;
}

interface BusKafkaPublishSite {
  path: string;
  method?: string;
  topic?: string;
  message_type?: string;
}

interface BusKafkaModel {
  service_hint?: string;
  handlers?: BusKafkaHandler[];
  publish_sites?: BusKafkaPublishSite[];
}

function normalizeBusKafkaModel(model: unknown): BusKafkaModel {
  if (!model || typeof model !== 'object') {
    return { handlers: [], publish_sites: [] };
  }
  return model as BusKafkaModel;
}

function addBusEdge(
  edges: IngestTransformResult['edges'],
  ctx: IngestContext,
  edgeType: 'consumes' | 'publishes',
  fromId: string,
  toId: string,
  sourcePath: string,
  metadata: Record<string, unknown>,
): void {
  edges.push({
    id: systemEdgeId(ctx.parser_id, edgeType, fromId, toId),
    project_id: ctx.project_id,
    analysis_run_id: ctx.analysis_run_id,
    parser_id: ctx.parser_id,
    language: 'system',
    from: fromId,
    to: toId,
    type: edgeType,
    path: sourcePath,
    metadata: withSystemLayer(metadata),
  });
}

export const busKafkaIngestAdapter: IngestAdapter = {
  parser_id: 'bus-kafka',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const messageTypeIds = new Map<string, string>();
    const messageTopicIds = new Map<string, string>();
    const parsed = normalizeBusKafkaModel(model);

    for (const handler of parsed.handlers ?? []) {
      const fromId = resolveComposeServiceIdFromHint(parsed.service_hint, handler.path);
      if (!fromId) {
        continue;
      }

      if (handler.message_type) {
        const messageTypeId = ensureMessageTypeNode(
          nodes,
          messageTypeIds,
          ctx,
          handler.message_type,
          handler.path,
          'kafka',
        );

        if (handler.role === 'consumer' || handler.role === 'both') {
          addBusEdge(edges, ctx, 'consumes', fromId, messageTypeId, handler.path, {
            class_name: handler.class_name,
            group_id: handler.group_id,
          });
        }
        if (handler.role === 'producer' || handler.role === 'both') {
          addBusEdge(edges, ctx, 'publishes', fromId, messageTypeId, handler.path, {
            class_name: handler.class_name,
          });
        }
      }

      const topicName = handler.topic ?? handler.topic_config_key;
      if (topicName) {
        const topicId = ensureMessageTopicNode(
          nodes,
          messageTopicIds,
          ctx,
          topicName,
          handler.path,
          'kafka',
        );
        if (handler.role === 'consumer' || handler.role === 'both') {
          addBusEdge(edges, ctx, 'consumes', fromId, topicId, handler.path, {
            class_name: handler.class_name,
            group_id: handler.group_id,
          });
        }
        if (handler.role === 'producer' || handler.role === 'both') {
          addBusEdge(edges, ctx, 'publishes', fromId, topicId, handler.path, {
            class_name: handler.class_name,
          });
        }
      }
    }

    for (const site of parsed.publish_sites ?? []) {
      const fromId = resolveComposeServiceIdFromHint(parsed.service_hint, site.path);
      if (!fromId) {
        continue;
      }

      if (site.message_type) {
        const messageTypeId = ensureMessageTypeNode(
          nodes,
          messageTypeIds,
          ctx,
          site.message_type,
          site.path,
          'kafka',
        );
        addBusEdge(edges, ctx, 'publishes', fromId, messageTypeId, site.path, {
          method: site.method,
        });
      }

      if (site.topic) {
        const topicId = ensureMessageTopicNode(nodes, messageTopicIds, ctx, site.topic, site.path, 'kafka');
        addBusEdge(edges, ctx, 'publishes', fromId, topicId, site.path, {
          method: site.method,
        });
      }
    }

    return { nodes, edges };
  },
};
