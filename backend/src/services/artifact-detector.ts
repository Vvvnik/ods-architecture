import { readFile } from 'node:fs/promises';
import { basename, join, posix } from 'node:path';

import type { ArtifactEntry } from '../domain/language-report.js';
import detectorRules from '../config/detector-rules.json' with { type: 'json' };

const MAX_SAMPLE_PATHS = 5;

interface ArtifactTypeRule {
  artifact_type: string;
  parser_id: string;
  basename?: string[];
  basename_prefix?: string[];
  basename_suffix?: string[];
  path_glob?: string[];
  path_suffix?: string[];
}

interface BusProfileRules {
  appsettings_keys: string[];
  csproj_packages: string[];
  cs_content_hints?: string[];
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*')
    .replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

const COMPILED_GLOBS = new Map<string, RegExp>();

function matchesGlob(path: string, pattern: string): boolean {
  let regex = COMPILED_GLOBS.get(pattern);
  if (!regex) {
    regex = globToRegExp(pattern);
    COMPILED_GLOBS.set(pattern, regex);
  }
  if (regex.test(path)) {
    return true;
  }
  if (pattern.startsWith('**/')) {
    const shortPattern = pattern.slice(3);
    let shortRegex = COMPILED_GLOBS.get(shortPattern);
    if (!shortRegex) {
      shortRegex = globToRegExp(shortPattern);
      COMPILED_GLOBS.set(shortPattern, shortRegex);
    }
    return shortRegex.test(path);
  }
  return false;
}

function matchesArtifactPath(path: string, rule: ArtifactTypeRule): boolean {
  const base = basename(path);

  if (rule.basename?.includes(base)) {
    return true;
  }

  if (rule.basename_prefix?.some((prefix) => base.startsWith(prefix))) {
    if (!rule.basename_suffix || rule.basename_suffix.some((suffix) => base.endsWith(suffix))) {
      return true;
    }
  }

  if (rule.path_suffix?.some((suffix) => path.endsWith(suffix))) {
    return true;
  }

  if (rule.path_glob?.some((pattern) => matchesGlob(path, pattern))) {
    return true;
  }

  return false;
}

function classifyArtifactPaths(paths: string[]): Map<string, { count: number; samples: string[] }> {
  const buckets = new Map<string, { count: number; samples: string[] }>();
  const rules = detectorRules.artifact_types as ArtifactTypeRule[];

  for (const path of paths) {
    for (const rule of rules) {
      if (!matchesArtifactPath(path, rule)) {
        continue;
      }
      const bucket = buckets.get(rule.artifact_type) ?? { count: 0, samples: [] };
      bucket.count += 1;
      if (bucket.samples.length < MAX_SAMPLE_PATHS) {
        bucket.samples.push(path);
      }
      buckets.set(rule.artifact_type, bucket);
      break;
    }
  }

  return buckets;
}

async function readTextIfSmall(absPath: string, maxBytes = 64_000): Promise<string | null> {
  try {
    const raw = await readFile(absPath, 'utf8');
    if (raw.length > maxBytes) {
      return raw.slice(0, maxBytes);
    }
    return raw;
  } catch {
    return null;
  }
}

async function detectBusProfile(
  paths: string[],
  workingCopyRoot: string,
): Promise<{ rabbit: number; kafka: number; samples: string[] }> {
  const busRules = detectorRules.bus as {
    rabbit: BusProfileRules;
    kafka: BusProfileRules;
  };

  let rabbit = 0;
  let kafka = 0;
  const samples: string[] = [];

  for (const relPath of paths) {
    const absPath = join(workingCopyRoot, relPath);
    const base = basename(relPath);

    if (base.endsWith('.csproj')) {
      const text = await readTextIfSmall(absPath);
      if (text) {
        if (busRules.rabbit.csproj_packages.some((pkg) => text.includes(pkg))) {
          rabbit += 1;
          if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
        }
        if (busRules.kafka.csproj_packages.some((pkg) => text.includes(pkg))) {
          kafka += 1;
          if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
        }
      }
      continue;
    }

    if (/appsettings.*\.json$/i.test(base)) {
      const text = await readTextIfSmall(absPath);
      if (text) {
        if (busRules.rabbit.appsettings_keys.some((key) => text.includes(`"${key}"`))) {
          rabbit += 1;
          if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
        }
        if (busRules.kafka.appsettings_keys.some((key) => text.includes(`"${key}"`))) {
          kafka += 1;
          if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
        }
      }
      continue;
    }

    if (base.endsWith('.cs')) {
      const text = await readTextIfSmall(absPath, 32_000);
      if (text && busRules.rabbit.cs_content_hints?.some((hint) => text.includes(hint))) {
        rabbit += 1;
        if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
      }
    }
  }

  return { rabbit, kafka, samples };
}

export async function detectArtifacts(
  workingCopyRoot: string,
  paths: string[],
): Promise<ArtifactEntry[]> {
  const buckets = classifyArtifactPaths(paths);
  const entries: ArtifactEntry[] = [];

  for (const rule of detectorRules.artifact_types as ArtifactTypeRule[]) {
    const bucket = buckets.get(rule.artifact_type);
    if (!bucket || bucket.count === 0) {
      continue;
    }
    entries.push({
      artifact_type: rule.artifact_type,
      file_count: bucket.count,
      sample_paths: bucket.samples,
      parser_id: rule.parser_id,
      parser_status: 'missing',
    });
  }

  const busSignals = await detectBusProfile(paths, workingCopyRoot);
  if (busSignals.rabbit > 0 || busSignals.kafka > 0) {
    const parserId =
      busSignals.rabbit > 0 && busSignals.kafka > 0
        ? 'bus-rabbit'
        : busSignals.rabbit > 0
          ? 'bus-rabbit'
          : 'bus-kafka';
    entries.push({
      artifact_type: 'bus',
      file_count: busSignals.rabbit + busSignals.kafka,
      sample_paths: busSignals.samples,
      parser_id: parserId,
      parser_status: 'missing',
    });
  }

  entries.sort((a, b) => {
    if (b.file_count !== a.file_count) {
      return b.file_count - a.file_count;
    }
    return a.artifact_type.localeCompare(b.artifact_type);
  });

  return entries;
}

export function pathsMatchingArtifact(paths: string[], artifactType: string): string[] {
  const rule = (detectorRules.artifact_types as ArtifactTypeRule[]).find(
    (entry) => entry.artifact_type === artifactType,
  );
  if (!rule) {
    if (artifactType === 'bus') {
      return paths.filter(
        (path) =>
          path.endsWith('.cs') ||
          path.endsWith('.csproj') ||
          /appsettings.*\.json$/i.test(basename(path)),
      );
    }
    return [];
  }
  return paths.filter((path) => matchesArtifactPath(path, rule));
}

export function artifactTypeForPath(path: string): string | null {
  for (const rule of detectorRules.artifact_types as ArtifactTypeRule[]) {
    if (matchesArtifactPath(path, rule)) {
      return rule.artifact_type;
    }
  }
  return null;
}
