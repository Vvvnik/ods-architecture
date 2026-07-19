import { composeServiceNodeId } from './system-layer.js';
import { inferComposeFile } from './api-routes-ids.js';

/** Compare key: strip petclinic prefix and trailing -service. */
export function normalizeSpringServiceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^spring-petclinic[-_]/, '')
    .replace(/[-_]service$/, '')
    .replace(/_/g, '-');
}

/** Display / compose name: strip petclinic prefix, keep -service suffix. */
export function displaySpringServiceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^spring-petclinic[-_]/, '')
    .replace(/_/g, '-');
}

export function resolveComposeServiceNameFromHint(
  hint: string | null | undefined,
  candidates?: string[],
): string | null {
  if (!hint) return null;
  if (!candidates?.length) {
    return displaySpringServiceName(hint);
  }
  const normalized = normalizeSpringServiceName(hint);
  const matches = candidates.filter(
    (candidate) => normalizeSpringServiceName(candidate) === normalized,
  );
  return matches.length === 1 ? matches[0] : null;
}

export function resolveComposeServiceIdFromHint(
  hint: string | null | undefined,
  sourcePath: string,
  candidates?: string[],
): string | null {
  const serviceName = resolveComposeServiceNameFromHint(hint, candidates);
  return serviceName
    ? composeServiceNodeId(serviceName, inferComposeFile(sourcePath))
    : null;
}

export function composeServiceNodeIdFromHint(hint: string, sourcePath: string): string {
  return composeServiceNodeId(
    displaySpringServiceName(hint),
    inferComposeFile(sourcePath),
  );
}
