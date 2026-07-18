/**
 * Короткая подпись для id узла графа (без compose-пути и префиксов парсера).
 *
 * Примеры:
 * - `compose:service:…#frontend` → `frontend`
 * - `ts-api-routes:http_endpoint:…#backend|POST|/api/v1/x` → `POST /api/v1/x`
 * - `openapi:http_endpoint:GET:/api/v1/x` → `GET /api/v1/x`
 */
export function shortGraphRefLabel(id: string): string {
  const hash = id.lastIndexOf('#');
  if (hash >= 0 && hash < id.length - 1) {
    const afterHash = id.slice(hash + 1);
    const pipeParts = afterHash.split('|');
    if (pipeParts.length >= 3) {
      const method = pipeParts[1] ?? '';
      const path = pipeParts.slice(2).join('|');
      return `${method} ${path}`.trim();
    }
    return afterHash;
  }

  const openapiEndpoint = id.match(/:http_endpoint:([A-Z]+):(.*)$/);
  if (openapiEndpoint) {
    return `${openapiEndpoint[1]} ${openapiEndpoint[2]}`.trim();
  }

  const colon = id.lastIndexOf(':');
  if (colon >= 0 && colon < id.length - 1) {
    return id.slice(colon + 1);
  }

  return id;
}

/** Единая подпись узла для inspector / крошек / поиска. */
export function displayGraphNodeLabel(
  node:
    | {
        id?: string;
        kind?: string;
        name?: string;
        qualified_name?: string;
      }
    | null
    | undefined,
  fallbackId?: string,
): string {
  const rawId = fallbackId ?? node?.id ?? '';
  if (node?.kind === 'http_endpoint' && node.qualified_name) {
    return node.qualified_name;
  }
  if (node?.name && node.name !== rawId) {
    return node.name;
  }
  if (node?.qualified_name && node.qualified_name !== rawId) {
    return node.qualified_name;
  }
  return rawId ? shortGraphRefLabel(rawId) : '';
}
