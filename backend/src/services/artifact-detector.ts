import { readFile } from 'node:fs/promises';
import { basename, dirname, join, posix } from 'node:path';

import type { ArtifactEntry, LanguageEntry } from '../domain/language-report.js';
import detectorRules from '../config/detector-rules.json' with { type: 'json' };

const MAX_SAMPLE_PATHS = 5;

const UI_SOURCE_EXTENSIONS = new Set([
  '.tsx',
  '.ts',
  '.jsx',
  '.js',
  '.mjs',
  '.cjs',
  '.css',
]);

const FRONTEND_LANG_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.css': 'css',
};

interface ArtifactTypeRule {
  artifact_type: string;
  parser_id: string;
  basename?: string[];
  basename_prefix?: string[];
  basename_suffix?: string[];
  path_glob?: string[];
  path_suffix?: string[];
  /** Substring signals; when set, path match alone is not enough for detect. */
  content_hints?: string[];
  /** When true, detection is handled outside classifyArtifactPaths (like bus). */
  custom_detection?: boolean;
}

interface BusProfileRules {
  appsettings_keys: string[];
  csproj_packages: string[];
  cs_content_hints?: string[];
  java_content_hints?: string[];
  maven_packages?: string[];
}

export interface FrontendUiDetection {
  entry: ArtifactEntry;
  spaRoots: string[];
  frontendLanguages: LanguageEntry[];
}

export interface FrontendAngularJsDetection {
  entry: ArtifactEntry;
  spaRoots: string[];
  frontendLanguages: LanguageEntry[];
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
  const rules = (detectorRules.artifact_types as ArtifactTypeRule[]).filter(
    (rule) => !rule.content_hints?.length && !rule.custom_detection,
  );

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

async function classifyContentHintArtifacts(
  paths: string[],
  workingCopyRoot: string,
): Promise<Map<string, { count: number; samples: string[] }>> {
  const buckets = new Map<string, { count: number; samples: string[] }>();
  const rules = (detectorRules.artifact_types as ArtifactTypeRule[]).filter(
    (rule) => Boolean(rule.content_hints?.length) && !rule.custom_detection,
  );

  for (const rule of rules) {
    const hints = rule.content_hints ?? [];
    for (const path of paths) {
      if (!matchesArtifactPath(path, rule)) {
        continue;
      }
      const text = await readTextIfSmall(join(workingCopyRoot, path), 32_000);
      if (!text || !hints.some((hint) => text.includes(hint))) {
        continue;
      }
      const bucket = buckets.get(rule.artifact_type) ?? { count: 0, samples: [] };
      bucket.count += 1;
      if (bucket.samples.length < MAX_SAMPLE_PATHS) {
        bucket.samples.push(path);
      }
      buckets.set(rule.artifact_type, bucket);
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

function packageJsonHasReact(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    };
    const deps = {
      ...parsed.dependencies,
      ...parsed.devDependencies,
      ...parsed.peerDependencies,
    };
    return Boolean(deps.react);
  } catch {
    return /["']react["']\s*:/.test(text);
  }
}

function isUiSourcePath(path: string): boolean {
  const posixPath = path.replace(/\\/g, '/');
  if (
    posixPath.includes('/node_modules/') ||
    posixPath.includes('/dist/') ||
    posixPath.startsWith('node_modules/') ||
    posixPath.startsWith('dist/')
  ) {
    return false;
  }
  const base = basename(posixPath);
  if (base.endsWith('.module.css')) {
    return true;
  }
  const ext = posix.extname(posixPath).toLowerCase();
  return UI_SOURCE_EXTENSIONS.has(ext);
}

function underSpaRoot(path: string, spaRoot: string): boolean {
  const posixPath = path.replace(/\\/g, '/');
  if (spaRoot === '.' || spaRoot === '') {
    // Whole working copy is the SPA — every relative path is under it.
    return true;
  }
  return posixPath === spaRoot || posixPath.startsWith(`${spaRoot}/`);
}

function collectFrontendLanguages(paths: string[], spaRoots: string[]): LanguageEntry[] {
  const counts = new Map<string, { count: number; samples: string[] }>();
  for (const path of paths) {
    if (!spaRoots.some((root) => underSpaRoot(path, root))) {
      continue;
    }
    if (!isUiSourcePath(path)) {
      continue;
    }
    const ext = path.endsWith('.module.css')
      ? '.css'
      : posix.extname(path.replace(/\\/g, '/')).toLowerCase();
    const language = FRONTEND_LANG_EXTENSIONS[ext];
    if (!language) {
      continue;
    }
    const bucket = counts.get(language) ?? { count: 0, samples: [] };
    bucket.count += 1;
    if (bucket.samples.length < MAX_SAMPLE_PATHS) {
      bucket.samples.push(path);
    }
    counts.set(language, bucket);
  }

  const entries: LanguageEntry[] = [];
  for (const [language, data] of counts) {
    entries.push({
      language,
      file_count: data.count,
      sample_paths: data.samples,
      parser_id: null,
      parser_status: 'missing',
    });
  }
  entries.sort((a, b) => {
    if (b.file_count !== a.file_count) {
      return b.file_count - a.file_count;
    }
    return a.language.localeCompare(b.language);
  });
  return entries;
}

function pickSamplePaths(spaRoots: string[], paths: string[]): string[] {
  const samples: string[] = [];
  const preferBasenames = new Set([
    'package.json',
    'main.tsx',
    'main.jsx',
    'main.ts',
    'main.js',
    'index.tsx',
    'index.jsx',
    'router.tsx',
    'router.jsx',
    'router.ts',
    'App.tsx',
    'App.jsx',
  ]);

  for (const root of spaRoots) {
    const pkg = root === '.' || root === '' ? 'package.json' : `${root}/package.json`;
    if (paths.includes(pkg) && samples.length < MAX_SAMPLE_PATHS) {
      samples.push(pkg);
    }
  }

  const ranked = paths
    .filter((path) => spaRoots.some((root) => underSpaRoot(path, root)))
    .filter((path) => preferBasenames.has(basename(path)) || isUiSourcePath(path))
    .sort((a, b) => {
      const aScore = preferBasenames.has(basename(a)) ? 0 : 1;
      const bScore = preferBasenames.has(basename(b)) ? 0 : 1;
      if (aScore !== bScore) {
        return aScore - bScore;
      }
      return a.localeCompare(b);
    });

  for (const path of ranked) {
    if (samples.includes(path)) {
      continue;
    }
    samples.push(path);
    if (samples.length >= MAX_SAMPLE_PATHS) {
      break;
    }
  }
  return samples;
}

/**
 * Detect React/TS SPA roots: package.json listing react; skip pure backend packages.
 */
export async function detectFrontendUi(
  workingCopyRoot: string,
  paths: string[],
): Promise<FrontendUiDetection | null> {
  const spaRoots: string[] = [];

  for (const relPath of paths) {
    const posixPath = relPath.replace(/\\/g, '/');
    if (basename(posixPath) !== 'package.json') {
      continue;
    }
    if (
      posixPath.includes('/node_modules/') ||
      posixPath.startsWith('node_modules/')
    ) {
      continue;
    }
    const text = await readTextIfSmall(join(workingCopyRoot, relPath));
    if (!text || !packageJsonHasReact(text)) {
      continue;
    }
    const root = dirname(posixPath).replace(/\\/g, '/');
    const spaRoot = root === '.' ? '.' : root;
    if (!spaRoots.includes(spaRoot)) {
      spaRoots.push(spaRoot);
    }
  }

  if (spaRoots.length === 0) {
    return null;
  }

  const uiPaths = paths.filter(
    (path) =>
      spaRoots.some((root) => underSpaRoot(path, root)) &&
      (isUiSourcePath(path) || basename(path) === 'package.json'),
  );
  const fileCount = uiPaths.filter((path) => isUiSourcePath(path)).length;
  if (fileCount === 0) {
    return null;
  }

  const frontendLanguages = collectFrontendLanguages(paths, spaRoots);
  const samplePaths = pickSamplePaths(spaRoots, paths);

  return {
    spaRoots,
    frontendLanguages,
    entry: {
      artifact_type: 'frontend-ui',
      file_count: fileCount,
      sample_paths: samplePaths,
      parser_id: 'react-ui',
      parser_status: 'missing',
      frontend_languages: frontendLanguages,
    },
  };
}

const ANGULAR2_HINTS = ['@angular/core', "from '@angular/", 'from "@angular/', 'standalone: true'];
const ANGULARJS_HINTS = ['angular.module(', '$stateProvider', '$routeProvider', 'ui.router', 'ng-app'];

function pathLooksAngularJsCandidate(path: string): boolean {
  const posixPath = path.replace(/\\/g, '/');
  if (posixPath.includes('spring-petclinic-ui/')) {
    return true;
  }
  if (/spring-petclinic-api-gateway\/.*\/static\/scripts\//.test(posixPath)) {
    return true;
  }
  if (/\/static\/scripts\/.+\.(js|html)$/i.test(posixPath)) {
    return true;
  }
  return false;
}

/**
 * Detect AngularJS 1.x SPA roots (021): prefer spring-petclinic-ui; else gateway static/scripts.
 */
export async function detectFrontendAngularjs(
  workingCopyRoot: string,
  paths: string[],
): Promise<FrontendAngularJsDetection | null> {
  const candidatePaths = paths
    .map((p) => p.replace(/\\/g, '/'))
    .filter((p) => pathLooksAngularJsCandidate(p) || basename(p) === 'app.js');

  const roots = new Set<string>();
  let angularJsHits = 0;
  let angular2Hits = 0;
  const sampleCandidates: string[] = [];

  for (const relPath of candidatePaths) {
    if (!/\.(js|html|htm)$/i.test(relPath) && basename(relPath) !== 'app.js') {
      continue;
    }
    const text = await readTextIfSmall(join(workingCopyRoot, relPath), 64_000);
    if (!text) {
      continue;
    }
    const isA2 = ANGULAR2_HINTS.some((h) => text.includes(h));
    const isAjs = ANGULARJS_HINTS.some((h) => text.includes(h));
    if (isA2) {
      angular2Hits += 1;
    }
    if (isAjs) {
      angularJsHits += 1;
      sampleCandidates.push(relPath);
      if (relPath.includes('spring-petclinic-ui/')) {
        const idx = relPath.indexOf('spring-petclinic-ui/');
        roots.add(relPath.slice(0, idx + 'spring-petclinic-ui'.length));
      } else {
        const m = relPath.match(/^(.*\/static\/scripts)(?:\/|$)/);
        if (m) {
          roots.add(m[1]);
        } else if (basename(relPath) === 'app.js') {
          roots.add(dirname(relPath).replace(/\\/g, '/'));
        }
      }
    }
  }

  if (angularJsHits === 0 || (angular2Hits > 0 && angularJsHits === 0)) {
    return null;
  }
  if (roots.size === 0) {
    return null;
  }

  // Prefer UI-module roots when both exist
  const spaRoots = [...roots].sort((a, b) => {
    const aUi = a.includes('spring-petclinic-ui') ? 0 : 1;
    const bUi = b.includes('spring-petclinic-ui') ? 0 : 1;
    if (aUi !== bUi) return aUi - bUi;
    return a.localeCompare(b);
  });

  const preferredRoots = spaRoots.some((r) => r.includes('spring-petclinic-ui'))
    ? spaRoots.filter((r) => r.includes('spring-petclinic-ui'))
    : spaRoots;

  const uiPaths = paths.filter(
    (path) =>
      preferredRoots.some((root) => underSpaRoot(path, root)) &&
      (/\.(js|html|htm|css)$/i.test(path) || basename(path) === 'bower.json'),
  );
  const fileCount = uiPaths.filter((path) => /\.(js|html|htm)$/i.test(path)).length;
  if (fileCount === 0) {
    return null;
  }

  const frontendLanguages = collectFrontendLanguages(
    paths.filter((p) => preferredRoots.some((root) => underSpaRoot(p, root))),
    preferredRoots,
  );
  // Force javascript when only scripts
  if (frontendLanguages.length === 0) {
    frontendLanguages.push({
      language: 'javascript',
      file_count: fileCount,
      sample_paths: sampleCandidates.slice(0, MAX_SAMPLE_PATHS),
      parser_id: null,
      parser_status: 'missing',
    });
  }

  const sample_paths = [
    ...sampleCandidates.filter((p) => basename(p) === 'app.js'),
    ...sampleCandidates,
  ]
    .filter((p, i, arr) => arr.indexOf(p) === i)
    .slice(0, MAX_SAMPLE_PATHS);

  return {
    spaRoots: preferredRoots,
    frontendLanguages,
    entry: {
      artifact_type: 'frontend-angularjs',
      file_count: fileCount,
      sample_paths: sample_paths.length > 0 ? sample_paths : uiPaths.slice(0, MAX_SAMPLE_PATHS),
      parser_id: 'angularjs-ui',
      parser_status: 'missing',
      frontend_languages: frontendLanguages,
    },
  };
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

    if (base.endsWith('.csproj') || base === 'pom.xml' || base === 'build.gradle' || base === 'build.gradle.kts') {
      const text = await readTextIfSmall(absPath);
      if (text) {
        const rabbitPkgs = [
          ...busRules.rabbit.csproj_packages,
          ...(busRules.rabbit.maven_packages ?? []),
        ];
        const kafkaPkgs = [
          ...busRules.kafka.csproj_packages,
          ...(busRules.kafka.maven_packages ?? []),
        ];
        if (rabbitPkgs.some((pkg) => text.includes(pkg))) {
          rabbit += 1;
          if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
        }
        if (kafkaPkgs.some((pkg) => text.includes(pkg))) {
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

    if (base.endsWith('.cs') || base.endsWith('.java')) {
      const text = await readTextIfSmall(absPath, 32_000);
      if (!text) continue;
      const rabbitHints = [
        ...(base.endsWith('.cs') ? busRules.rabbit.cs_content_hints ?? [] : []),
        ...(base.endsWith('.java') ? busRules.rabbit.java_content_hints ?? [] : []),
      ];
      const kafkaHints = [
        ...(base.endsWith('.cs') ? busRules.kafka.cs_content_hints ?? [] : []),
        ...(base.endsWith('.java') ? busRules.kafka.java_content_hints ?? [] : []),
      ];
      if (rabbitHints.some((hint) => text.includes(hint))) {
        rabbit += 1;
        if (samples.length < MAX_SAMPLE_PATHS) samples.push(relPath);
      }
      if (kafkaHints.some((hint) => text.includes(hint))) {
        kafka += 1;
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
  const contentBuckets = await classifyContentHintArtifacts(paths, workingCopyRoot);
  for (const [artifactType, bucket] of contentBuckets) {
    buckets.set(artifactType, bucket);
  }
  const entries: ArtifactEntry[] = [];

  for (const rule of detectorRules.artifact_types as ArtifactTypeRule[]) {
    if (rule.custom_detection) {
      continue;
    }
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

  const frontendUi = await detectFrontendUi(workingCopyRoot, paths);
  if (frontendUi) {
    entries.push(frontendUi.entry);
  }

  const frontendAngularjs = await detectFrontendAngularjs(workingCopyRoot, paths);
  if (frontendAngularjs) {
    entries.push(frontendAngularjs.entry);
  }

  entries.sort((a, b) => {
    if (b.file_count !== a.file_count) {
      return b.file_count - a.file_count;
    }
    return a.artifact_type.localeCompare(b.artifact_type);
  });

  return entries;
}

/** Expose SPA roots for path-scoped frontend language reports. */
export async function detectFrontendUiSpaRoots(
  workingCopyRoot: string,
  paths: string[],
): Promise<string[]> {
  const detected = await detectFrontendUi(workingCopyRoot, paths);
  return detected?.spaRoots ?? [];
}

export function pathsMatchingArtifact(paths: string[], artifactType: string): string[] {
  if (artifactType === 'frontend-ui') {
    return paths.filter((path) => {
      const posixPath = path.replace(/\\/g, '/');
      // Prefer SPA path prefixes; over-include package.json / JSX / CSS.
      if (
        posixPath === 'frontend' ||
        posixPath.startsWith('frontend/') ||
        posixPath.includes('/frontend/')
      ) {
        return true;
      }
      if (basename(posixPath) === 'package.json') {
        return true;
      }
      const base = basename(posixPath);
      if (base.endsWith('.module.css') || posixPath.endsWith('.css')) {
        return true;
      }
      const ext = posix.extname(posixPath).toLowerCase();
      return ext === '.tsx' || ext === '.jsx';
    });
  }

  if (artifactType === 'frontend-angularjs') {
    return paths.filter((path) => {
      const posixPath = path.replace(/\\/g, '/');
      if (posixPath.includes('spring-petclinic-ui/')) {
        return true;
      }
      if (/\/static\/scripts\//.test(posixPath)) {
        return true;
      }
      if (posixPath.includes('spring-petclinic-api-gateway/') && /\.(js|html|htm|css)$/i.test(posixPath)) {
        return /\/static\//.test(posixPath);
      }
      return false;
    });
  }

  const rule = (detectorRules.artifact_types as ArtifactTypeRule[]).find(
    (entry) => entry.artifact_type === artifactType,
  );
  if (!rule) {
    if (artifactType === 'bus') {
      return paths.filter(
        (path) =>
          path.endsWith('.cs') ||
          path.endsWith('.java') ||
          path.endsWith('.csproj') ||
          basename(path) === 'pom.xml' ||
          basename(path) === 'build.gradle' ||
          basename(path) === 'build.gradle.kts' ||
          /appsettings.*\.json$/i.test(basename(path)),
      );
    }
    return [];
  }
  if (rule.custom_detection) {
    return [];
  }
  return paths.filter((path) => matchesArtifactPath(path, rule));
}

export function artifactTypeForPath(path: string): string | null {
  for (const rule of detectorRules.artifact_types as ArtifactTypeRule[]) {
    if (rule.custom_detection) {
      continue;
    }
    if (matchesArtifactPath(path, rule)) {
      return rule.artifact_type;
    }
  }
  return null;
}
