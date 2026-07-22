/**
 * Match OpenAPI METHOD+path to an existing code-sourced http_endpoint.
 * Prefer unique matches; when service_hint is set, prefer that service.
 */

export interface CodeHttpEndpointRef {
  id: string;
  method: string;
  path: string;
  service_name?: string;
}

function normalizePath(path: string): string {
  const raw = decodeURIComponent(String(path).split(/[?#]/, 1)[0] || '/');
  const trimmed = raw.replace(/\/+$/, '') || '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function findMatchingCodeHttpEndpoint(
  endpoints: CodeHttpEndpointRef[],
  method: string,
  path: string,
  serviceHint?: string | null,
): CodeHttpEndpointRef | null {
  const m = method.toUpperCase();
  const p = normalizePath(path);
  const matches = endpoints.filter(
    (entry) => entry.method.toUpperCase() === m && normalizePath(entry.path) === p,
  );
  if (matches.length === 0) return null;

  if (serviceHint) {
    const hint = serviceHint.toLowerCase();
    const withService = matches.filter((entry) => {
      if (entry.service_name?.toLowerCase() === hint) return true;
      return entry.id.toLowerCase().includes(`|${hint}|`) || entry.id.toLowerCase().includes(`${hint}|`);
    });
    if (withService.length === 1) return withService[0];
    if (withService.length > 1) return null;
  }

  return matches.length === 1 ? matches[0] : null;
}
