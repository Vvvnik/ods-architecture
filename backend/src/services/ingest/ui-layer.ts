export function withUiLayer(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    layer: 'ui',
  };
}

export function uiNodeId(parserId: string, kind: string, stableKey: string): string {
  return `${parserId}:${kind}:${stableKey}`;
}

export function uiEdgeId(
  parserId: string,
  type: string,
  from: string,
  to: string,
): string {
  return `${parserId}:${type}:${from}->${to}`;
}

export function apiHintNodeId(parserId: string, method: string, pathTemplate: string): string {
  return `${parserId}:api_hint:${method.toUpperCase()}:${pathTemplate}`;
}
