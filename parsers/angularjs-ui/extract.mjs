/**
 * AngularJS 1.x UI landscape extract (021): apps, URL-bearing non-abstract
 * states/routes, screen-level literal $http calls. Heuristic/regex — no full AST.
 */

import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

export function posixPath(path) {
  return path.replace(/\\/g, '/');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readText(absPath) {
  try {
    return await readFile(absPath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Prefer spring-petclinic-ui; else gateway static/scripts with AngularJS signals.
 * @returns {string[]} root directories (posix, relative) containing scripts
 */
export function discoverAngularJsRoots(files) {
  const posixFiles = files.map(posixPath);
  const uiModuleRoots = new Set();
  const gatewayScriptRoots = new Set();

  for (const path of posixFiles) {
    const mUi = path.match(/^(.*\/)?spring-petclinic-ui(\/|$)/);
    if (mUi) {
      const prefix = mUi[1] ?? '';
      uiModuleRoots.add(`${prefix}spring-petclinic-ui`.replace(/\/$/, '') || 'spring-petclinic-ui');
    }
    const mGw = path.match(
      /^(.*spring-petclinic-api-gateway\/src\/main\/resources\/static\/scripts)(\/|$)/,
    );
    if (mGw) {
      gatewayScriptRoots.add(mGw[1]);
    }
    // Generic: …/static/scripts/app.js with angular nearby
    if (/\/static\/scripts\//.test(path) && basename(path) === 'app.js') {
      gatewayScriptRoots.add(dirname(path));
    }
  }

  if (uiModuleRoots.size > 0) {
    return [...uiModuleRoots].sort();
  }
  return [...gatewayScriptRoots].sort();
}

function underRoot(path, root) {
  const p = posixPath(path);
  const r = posixPath(root);
  return p === r || p.startsWith(`${r}/`);
}

function isAngularJsSource(path) {
  const ext = path.slice(path.lastIndexOf('.')).toLowerCase();
  return ext === '.js' || ext === '.html' || ext === '.htm';
}

function looksLikeAngular2(text) {
  return (
    /@angular\/core/.test(text) ||
    /from\s+['"]@angular\//.test(text) ||
    /standalone\s*:\s*true/.test(text)
  );
}

function looksLikeAngularJs(text) {
  return (
    /angular\.module\s*\(/.test(text) ||
    /\$stateProvider/.test(text) ||
    /\$routeProvider/.test(text) ||
    /\bui\.router\b/.test(text) ||
    /\bng-app\b/.test(text)
  );
}

/**
 * Parse $stateProvider.state('name', { ... }) blocks — shallow brace match.
 */
export function extractStatesFromText(text, sourcePath) {
  const states = [];
  const re = /\.state\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const name = match[1];
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let end = start;
    for (let i = start; i < text.length; i += 1) {
      const ch = text[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = text.slice(start, end + 1);
    const abstract = /\babstract\s*:\s*true\b/.test(body);
    const urlMatch = body.match(/\burl\s*:\s*['"]([^'"]*)['"]/);
    const url = urlMatch ? urlMatch[1] : '';
    const templateUrlMatch = body.match(/\btemplateUrl\s*:\s*['"]([^'"]+)['"]/);
    const templateMatch = body.match(/\btemplate\s*:\s*['"]([^'"]*)['"]/);
    states.push({
      name,
      abstract,
      url,
      templateUrl: templateUrlMatch?.[1],
      hasTemplate: Boolean(templateMatch || templateUrlMatch),
      source_path: sourcePath,
    });
  }
  return states;
}

/**
 * Parse $routeProvider.when('/path', { ... })
 */
export function extractRoutesFromText(text, sourcePath) {
  const routes = [];
  const re = /\.when\s*\(\s*['"]([^'"]+)['"]\s*,\s*\{/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    const pathPattern = match[1];
    routes.push({
      name: pathPattern.replace(/^\//, '').replace(/\//g, '-') || 'root',
      abstract: false,
      url: pathPattern,
      source_path: sourcePath,
    });
  }
  return routes;
}

/**
 * Literal $http.(get|post|put|patch|delete)('path')
 */
export function extractHttpCallsFromText(text) {
  const calls = [];
  const re =
    /\$http\s*\.\s*(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    calls.push({
      method: match[1].toUpperCase(),
      path_template: match[2].startsWith('/') ? match[2] : `/${match[2]}`,
    });
  }
  return calls;
}

function humanizeStateName(name) {
  return name
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isDodPage(state) {
  if (state.abstract) {
    return false;
  }
  // Navigable URL: non-empty url, or '' only if not abstract (rare); require url defined
  if (state.url === undefined || state.url === null) {
    return false;
  }
  // Empty url on non-abstract is still a state but often layout; require leading / or non-empty
  if (state.url === '') {
    return false;
  }
  return true;
}

/**
 * Map controller files to state by path heuristics (owner-list → owners).
 */
function attachHttpToScreens(routes, fileContents) {
  for (const route of routes) {
    const screen = route.screen;
    if (!screen) continue;
    const key = route.stable_key.toLowerCase();
    const calls = [];
    for (const [path, text] of fileContents) {
      const base = basename(path).toLowerCase();
      const dir = dirname(path).toLowerCase();
      const related =
        dir.includes(key) ||
        base.includes(key) ||
        (key === 'owners' && (dir.includes('owner-list') || dir.includes('owner-details'))) ||
        (key === 'vets' && dir.includes('vet')) ||
        (key === 'welcome' && dir.includes('welcome'));
      if (!related) continue;
      if (!base.endsWith('.js')) continue;
      calls.push(...extractHttpCallsFromText(text));
    }
    // Dedupe
    const seen = new Set();
    screen.api_calls = calls.filter((c) => {
      const id = `${c.method}:${c.path_template}`;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    if (screen.api_calls.length === 0) {
      delete screen.api_calls;
    }
  }
}

export async function extractUiTree(workingCopyRoot, files) {
  const posixFiles = files.map(posixPath);
  let roots = discoverAngularJsRoots(posixFiles);

  // Fallback: any directory with app.js containing angular.module
  if (roots.length === 0) {
    for (const path of posixFiles) {
      if (basename(path) !== 'app.js') continue;
      const text = await readText(join(workingCopyRoot, path));
      if (text && looksLikeAngularJs(text) && !looksLikeAngular2(text)) {
        roots.push(dirname(path));
      }
    }
  }

  if (roots.length === 0) {
    return { apps: [] };
  }

  const apps = [];

  for (const root of roots) {
    const rootFiles = posixFiles.filter((p) => underRoot(p, root) && isAngularJsSource(p));
    const fileContents = new Map();
    let hasAngularJs = false;
    let hasAngular2 = false;

    for (const rel of rootFiles) {
      const text = await readText(join(workingCopyRoot, rel));
      if (!text) continue;
      fileContents.set(rel, text);
      if (looksLikeAngular2(text)) hasAngular2 = true;
      if (looksLikeAngularJs(text)) hasAngularJs = true;
    }

    if (!hasAngularJs || (hasAngular2 && !hasAngularJs)) {
      continue;
    }
    if (hasAngular2 && !fileContents.values().next().value) {
      continue;
    }
    // Reject pure Angular 2 trees
    let angularJsHits = 0;
    let angular2Hits = 0;
    for (const text of fileContents.values()) {
      if (looksLikeAngularJs(text)) angularJsHits += 1;
      if (looksLikeAngular2(text)) angular2Hits += 1;
    }
    if (angular2Hits > 0 && angularJsHits === 0) {
      continue;
    }

    const allStates = [];
    const allWhenRoutes = [];
    for (const [path, text] of fileContents) {
      allStates.push(...extractStatesFromText(text, path));
      allWhenRoutes.push(...extractRoutesFromText(text, path));
    }

    const pageStates = allStates.filter(isDodPage);
    const routes = [];

    for (const state of pageStates) {
      const pathPattern = state.url.startsWith('/') ? state.url : `/${state.url}`;
      const stableKey = state.name.replace(/\./g, '-');
      routes.push({
        stable_key: stableKey,
        path_pattern: pathPattern,
        source_path: state.source_path,
        screen: {
          stable_key: stableKey,
          name: humanizeStateName(state.name),
          source_path: state.templateUrl
            ? posixPath(join(dirname(state.source_path), state.templateUrl).replace(/\\/g, '/'))
            : state.source_path,
          frames: [{ stable_key: 'main', role: 'main', name: 'Main' }],
        },
      });
    }

    for (const route of allWhenRoutes) {
      if (routes.some((r) => r.path_pattern === route.url || r.path_pattern === `/${route.url}`)) {
        continue;
      }
      const pathPattern = route.url.startsWith('/') ? route.url : `/${route.url}`;
      const stableKey = route.name;
      routes.push({
        stable_key: stableKey,
        path_pattern: pathPattern,
        source_path: route.source_path,
        screen: {
          stable_key: stableKey,
          name: humanizeStateName(route.name),
          source_path: route.source_path,
          frames: [{ stable_key: 'main', role: 'main', name: 'Main' }],
        },
      });
    }

    attachHttpToScreens(routes, fileContents);

    const entryCandidates = rootFiles.filter((p) => basename(p) === 'app.js');
    const entry_path = entryCandidates[0] ?? rootFiles[0] ?? `${root}/`;

    const stable_key = root
      .replace(/\/src\/main\/resources\/static\/scripts$/, '-static')
      .replace(/\//g, '-')
      .replace(/^-/, '') || 'angularjs-app';

    apps.push({
      stable_key,
      name: 'Petclinic UI',
      framework: 'angularjs',
      language: 'javascript',
      entry_path,
      routes,
    });
  }

  return { apps };
}

export { escapeRegExp };
