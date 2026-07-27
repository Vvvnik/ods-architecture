import { fitLogicalIdForEs } from './node-id.js';

export function withUiLayer(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    layer: 'ui',
  };
}

export function uiNodeId(parserId: string, kind: string, stableKey: string): string {
  return fitLogicalIdForEs(`${parserId}:${kind}:${stableKey}`);
}

export function uiEdgeId(
  parserId: string,
  type: string,
  from: string,
  to: string,
): string {
  return fitLogicalIdForEs(`${parserId}:${type}:${from}->${to}`);
}

export function apiHintNodeId(parserId: string, method: string, pathTemplate: string): string {
  return fitLogicalIdForEs(
    `${parserId}:api_hint:${method.toUpperCase()}:${pathTemplate}`,
  );
}
