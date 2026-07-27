import { resolve } from 'node:path';

export type LocalPathAlias = { hostPrefix: string; containerPrefix: string };

/**
 * Build host→container aliases for Docker local_path imports.
 * Longer host prefixes win (more specific).
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
      const splitAt = entry.indexOf(':');
      if (splitAt <= 0 || splitAt === entry.length - 1) {
        continue;
      }
      // Allow Windows drive letters: C:\foo:/repos — host is before last colon? 
      // Pilot is Unix/Docker; use first colon after optional leading slash path.
      const hostPrefix = normalizePrefix(entry.slice(0, splitAt));
      const containerPrefix = normalizePrefix(entry.slice(splitAt + 1));
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
  const resolved = resolve(sourceValue);
  for (const { hostPrefix, containerPrefix } of aliases) {
    if (resolved === hostPrefix) {
      return containerPrefix;
    }
    if (resolved.startsWith(`${hostPrefix}/`)) {
      return `${containerPrefix}${resolved.slice(hostPrefix.length)}`;
    }
  }
  return resolved;
}

function normalizePrefix(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  // Do not use path.resolve on host paths inside Linux containers — it would
  // keep /Users/... as-is; we only strip trailing slashes.
  if (trimmed === '/') {
    return '/';
  }
  return trimmed.replace(/\/+$/, '');
}
