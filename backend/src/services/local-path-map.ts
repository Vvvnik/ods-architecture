import { resolve } from 'node:path';

export type LocalPathAlias = { hostPrefix: string; containerPrefix: string };

/**
 * Build host→container aliases for Docker local_path imports.
 * Longer host prefixes win (more specific).
 *
 * LOCAL_PATH_MAP entries use `host:container` where container is a POSIX path
 * starting with `/` (e.g. `/repos-extra`). Split on `:/` so Windows drives
 * (`C:/Users/…:/repos-extra`) are not broken by the first colon.
 */
export function buildLocalPathAliases(input: {
  localReposMount: string;
  localReposHostPath?: string | null;
  localPathMap?: string | null;
}): LocalPathAlias[] {
  const aliases: LocalPathAlias[] = [];

  const hostRoot = normalizePrefix(input.localReposHostPath ?? '');
  const mountRoot = normalizePrefix(input.localReposMount);
  if (hostRoot && mountRoot && hostRoot !== mountRoot) {
    aliases.push({ hostPrefix: hostRoot, containerPrefix: mountRoot });
  }

  const rawMap = (input.localPathMap ?? '').trim();
  if (rawMap) {
    for (const part of rawMap.split(',')) {
      const entry = part.trim();
      if (!entry) {
        continue;
      }
      const split = splitHostContainerEntry(entry);
      if (!split) {
        continue;
      }
      const hostPrefix = normalizePrefix(split.host);
      const containerPrefix = normalizePrefix(split.container);
      if (!hostPrefix || !containerPrefix || hostPrefix === containerPrefix) {
        continue;
      }
      aliases.push({ hostPrefix, containerPrefix });
    }
  }

  aliases.sort((a, b) => b.hostPrefix.length - a.hostPrefix.length);
  return aliases;
}

/** Map a user-supplied local_path to the path visible inside the backend process. */
export function mapLocalPathToFsRoot(
  sourceValue: string,
  aliases: LocalPathAlias[],
): string {
  const resolved = canonicalizeInputPath(sourceValue);
  for (const { hostPrefix, containerPrefix } of aliases) {
    if (pathEquals(resolved, hostPrefix)) {
      return containerPrefix;
    }
    if (resolved.startsWith(`${hostPrefix}/`)) {
      return `${containerPrefix}${resolved.slice(hostPrefix.length)}`;
    }
  }
  return resolved;
}

/**
 * Split `host:container` on `:/` (container is always absolute POSIX in Docker).
 * Falls back to last `:` for unusual entries without a leading slash on container.
 */
export function splitHostContainerEntry(
  entry: string,
): { host: string; container: string } | null {
  const normalized = entry.replaceAll('\\', '/').trim();
  const delim = normalized.lastIndexOf(':/');
  if (delim > 0) {
    return {
      host: normalized.slice(0, delim),
      container: normalized.slice(delim + 1),
    };
  }
  const lastColon = normalized.lastIndexOf(':');
  if (lastColon <= 0 || lastColon === normalized.length - 1) {
    return null;
  }
  // Reject lone Windows drive `C:` without a container path.
  if (/^[A-Za-z]:$/.test(normalized.slice(0, lastColon + 1).replace(/\/$/, ''))) {
    return null;
  }
  return {
    host: normalized.slice(0, lastColon),
    container: normalized.slice(lastColon + 1),
  };
}

function canonicalizeInputPath(value: string): string {
  const normalized = normalizePrefix(value);
  if (!normalized) {
    return normalized;
  }
  // Absolute POSIX or Windows drive path — do not path.resolve inside Linux
  // containers (would prefix cwd and break host-path mapping).
  if (normalized.startsWith('/') || isWindowsAbsolute(normalized)) {
    return normalized;
  }
  return normalizePrefix(resolve(value));
}

function isWindowsAbsolute(path: string): boolean {
  return /^[A-Za-z]:\//.test(path);
}

function pathEquals(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  // Windows drive letters are case-insensitive on the host.
  if (isWindowsAbsolute(a) && isWindowsAbsolute(b)) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return false;
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim().replaceAll('\\', '/');
  if (!trimmed) {
    return '';
  }
  if (trimmed === '/') {
    return '/';
  }
  let out = trimmed.replace(/\/+$/, '');
  if (isWindowsAbsolute(out)) {
    out = `${out[0]!.toUpperCase()}${out.slice(1)}`;
  }
  return out;
}
