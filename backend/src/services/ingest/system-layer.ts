import { fitLogicalIdForEs } from './node-id.js';

export function withSystemLayer(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    layer: 'system',
  };
}

export function systemNodeId(parserId: string, kind: string, stableKey: string): string {
  return fitLogicalIdForEs(`${parserId}:${kind}:${stableKey}`);
}

export function composeServiceStableKey(composeFile: string, serviceName: string): string {
  return `${composeFile}#${serviceName.toLowerCase()}`;
}

/** Compose service id used by cross-parser heuristics (research R5/R6). */
export function composeServiceNodeId(
  serviceName: string,
  composeFile = 'docker-compose.yml',
): string {
  return systemNodeId('compose', 'service', composeServiceStableKey(composeFile, serviceName));
}

export function resolveComposeServiceIdFromHint(
  serviceHint: string | undefined,
  sourcePath: string,
  composeFile = 'docker-compose.yml',
): string | null {
  const hint =
    serviceHint ??
    (() => {
      const parts = sourcePath.replace(/\\/g, '/').split('/');
      if (parts.length < 2) {
        return null;
      }
      const parent = parts[parts.length - 2] ?? null;
      if (!parent || ['src', 'config', 'configs', 'settings', 'contracts'].includes(parent.toLowerCase())) {
        return null;
      }
      return parent;
    })();
  if (!hint) {
    return null;
  }
  return composeServiceNodeId(hint, composeFile);
}

export function systemEdgeId(
  parserId: string,
  type: string,
  from: string,
  to: string,
): string {
  return fitLogicalIdForEs(`${parserId}:${type}:${from}->${to}`);
}
