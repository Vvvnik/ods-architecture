/**
 * Короткая подпись для id узла графа (без compose-пути и префиксов парсера).
 *
 * Примеры:
 * - `compose:service:…#frontend` → `frontend`
 * - `ts-api-routes:http_endpoint:…#backend|POST|/api/v1/x` → `POST /api/v1/x`
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

  const colon = id.lastIndexOf(':');
  if (colon >= 0 && colon < id.length - 1) {
    return id.slice(colon + 1);
  }

  return id;
}
