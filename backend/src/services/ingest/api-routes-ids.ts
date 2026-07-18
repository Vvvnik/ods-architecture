import { createHash } from 'node:crypto';

import {
  composeServiceNodeId,
  systemNodeId,
} from './system-layer.js';

const SKIP_SEGMENTS = new Set([
  'src',
  'lib',
  'app',
  'apps',
  'packages',
  'routes',
  'handlers',
  'controllers',
  'config',
  'configs',
  'settings',
  'contracts',
  'tests',
  'test',
  'dist',
  'node_modules',
  'bin',
  'obj',
  'wwwroot',
]);

/** Path segment → service name (backend/src/... → backend). */
export function serviceHintFromSourcePath(sourcePath: string): string | null {
  const parts = sourcePath.replace(/\\/g, '/').split('/').filter(Boolean);
  const dirs = parts.slice(0, -1);
  for (const part of dirs) {
    const lower = part.toLowerCase();
    if (SKIP_SEGMENTS.has(lower) || part.includes('.')) {
      continue;
    }
    return lower;
  }
  return null;
}

/**
 * Compose file for service id. Monorepo ODS layout uses
 * `docker/docker-compose.dev.yml`; fixtures use root `docker-compose.yml`.
 */
export function inferComposeFile(sourcePath: string): string {
  const posix = sourcePath.replace(/\\/g, '/');
  if (/^(backend|frontend|parsers)\//.test(posix)) {
    return 'docker/docker-compose.dev.yml';
  }
  return 'docker-compose.yml';
}

export function unscopedServiceStable(sourcePath: string): string {
  const hash = createHash('sha1')
    .update(sourcePath.replace(/\\/g, '/'))
    .digest('hex')
    .slice(0, 12);
  return `unscoped:${hash}`;
}

export function httpEndpointStableKey(
  serviceStable: string,
  method: string,
  path: string,
): string {
  return `${serviceStable}|${method.toUpperCase()}|${path}`;
}

export function httpEndpointNodeId(
  parserId: string,
  serviceStable: string,
  method: string,
  path: string,
): string {
  return systemNodeId(
    parserId,
    'http_endpoint',
    httpEndpointStableKey(serviceStable, method, path),
  );
}

export interface ResolvedApiRouteService {
  serviceId: string | null;
  serviceStable: string;
  serviceName: string | null;
  composeFile: string;
}

export function resolveApiRouteService(options: {
  serviceHint?: string | null;
  sourcePath: string;
  composeFile?: string;
}): ResolvedApiRouteService {
  const hint = (
    options.serviceHint?.trim() ||
    serviceHintFromSourcePath(options.sourcePath) ||
    ''
  ).toLowerCase();
  const composeFile = options.composeFile ?? inferComposeFile(options.sourcePath);

  if (!hint || SKIP_SEGMENTS.has(hint)) {
    return {
      serviceId: null,
      serviceStable: unscopedServiceStable(options.sourcePath),
      serviceName: null,
      composeFile,
    };
  }

  return {
    serviceId: composeServiceNodeId(hint, composeFile),
    serviceStable: `${composeFile}#${hint}`,
    serviceName: hint,
    composeFile,
  };
}
