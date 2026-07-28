import type { IngestAdapter, IngestContext, IngestTransformResult } from '../types.js';
import {
  resolveComposeServiceIdFromHint,
  systemEdgeId,
  systemNodeId,
  withSystemLayer,
} from '../system-layer.js';

interface AppSettingsBinding {
  key: string;
  binding_type: string;
  engine?: string;
  target_hint?: string;
  raw_redacted?: string;
}

interface AppSettingsSource {
  path: string;
  environment?: string;
  service_hint?: string;
  bindings?: AppSettingsBinding[];
}

interface AppSettingsModel {
  sources?: AppSettingsSource[];
}

type InfraKind = 'database' | 'broker' | 'cache' | 'storage' | 'search';

function normalizeAppSettingsModel(model: unknown): AppSettingsSource[] {
  if (!model || typeof model !== 'object') {
    return [];
  }
  const record = model as AppSettingsModel;
  return (record.sources ?? []).filter((entry): entry is AppSettingsSource => Boolean(entry && typeof entry === 'object'));
}

function connectionName(key: string): string {
  const match = key.match(/ConnectionStrings__([^_]+(?:__[^_]+)*)/i);
  if (match) {
    return match[1].replace(/__/g, ':');
  }
  const segments = key.split('__');
  return segments[segments.length - 1] ?? key;
}

function isPlaceholderBinding(binding: AppSettingsBinding): boolean {
  if (binding.engine) {
    return false;
  }
  const raw = binding.raw_redacted ?? '';
  return raw.includes('***') || raw.length === 0;
}

function bindingTargetKind(bindingType: string): InfraKind | null {
  if (bindingType === 'database') {
    return 'database';
  }
  if (bindingType === 'broker') {
    return 'broker';
  }
  if (bindingType === 'cache') {
    return 'cache';
  }
  if (bindingType === 'storage') {
    return 'storage';
  }
  if (bindingType === 'search') {
    return 'search';
  }
  return null;
}

function stableInfraKey(kind: InfraKind, binding: AppSettingsBinding): string {
  if (kind === 'database') {
    return connectionName(binding.key);
  }
  if (binding.target_hint) {
    return binding.target_hint;
  }
  // Prefer section / connection leaf name over flattened tails.
  if (!binding.key.includes('__') || binding.key.startsWith('ConnectionStrings__')) {
    return connectionName(binding.key);
  }
  return binding.key.split('__')[0] ?? binding.key;
}

export const appsettingsIngestAdapter: IngestAdapter = {
  parser_id: 'appsettings',
  supported_schema_versions: ['1'],
  transform(model: unknown, ctx: IngestContext): IngestTransformResult {
    const nodes: IngestTransformResult['nodes'] = [];
    const edges: IngestTransformResult['edges'] = [];
    const targetIds = new Map<string, string>();

    for (const source of normalizeAppSettingsModel(model)) {
      const serviceId = resolveComposeServiceIdFromHint(source.service_hint, source.path);

      for (const binding of source.bindings ?? []) {
        const kind = bindingTargetKind(binding.binding_type);
        if (!kind || isPlaceholderBinding(binding)) {
          continue;
        }

        const stableKey = stableInfraKey(kind, binding);
        const dedupKey = binding.engine
          ? `${kind}:${binding.engine}:${stableKey}`
          : `${kind}:${stableKey}`;
        const existingId = targetIds.get(dedupKey) ?? targetIds.get(`${kind}:${stableKey}`);
        const targetId = existingId ?? systemNodeId(ctx.parser_id, kind, stableKey);

        if (!existingId) {
          targetIds.set(dedupKey, targetId);
          targetIds.set(`${kind}:${stableKey}`, targetId);
          nodes.push({
            id: targetId,
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            kind,
            name: stableKey,
            qualified_name: binding.target_hint ?? stableKey,
            language: 'json',
            path: source.path,
            metadata: withSystemLayer({
              key: binding.key,
              engine: binding.engine,
              environment: source.environment,
            }),
          });
        }

        if (serviceId) {
          edges.push({
            id: systemEdgeId(ctx.parser_id, 'connects_to', serviceId, targetId),
            project_id: ctx.project_id,
            analysis_run_id: ctx.analysis_run_id,
            parser_id: ctx.parser_id,
            language: 'system',
            from: serviceId,
            to: targetId,
            type: 'connects_to',
            path: source.path,
            metadata: withSystemLayer({ key: binding.key }),
          });
        }
      }
    }

    return { nodes, edges };
  },
};
