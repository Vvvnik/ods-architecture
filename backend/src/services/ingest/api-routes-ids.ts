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

/**
 * Fastify catch-all routes are extracted as `…/resource/*` (013).
 * Clients usually call `…/resource/:id/…` or `…/resource/${encode…}/…`.
 * Align the client path to the splat route path for stable endpoint ids
 * (014 http_calls → existing http_endpoint).
 *
 * Only known splat resource segments — collapsing any `/static/:param/…`
 * would wrongly turn `/projects/:projectId/…` into `/projects/*`.
 */
const FASTIFY_SPLAT_RESOURCE_SEGMENTS = new Set([
  'nodes',
  'files',
  'assets',
  'static',
  'media',
  'blobs',
  'objects',
  'content',
  'raw',
  'proxy',
]);

/**
 * Map a client HTTP path to the Fastify splat route path when applicable.
 * Unchanged when the path is already concrete (e.g. `…/graph/summary`).
 */
export function alignClientPathToFastifySplatRoute(httpPath: string): string {
  const path = httpPath.replace(/\/+$/, '') || '/';
  if (path.endsWith('/*')) {
    return path;
  }
  for (const segment of FASTIFY_SPLAT_RESOURCE_SEGMENTS) {
    const re = new RegExp(`^(.*)/${segment}/.+$`, 'i');
    if (re.test(path)) {
      return path.replace(new RegExp(`^(.*)/${segment}/.+$`, 'i'), `$1/${segment}/*`);
    }
  }
  return path;
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
