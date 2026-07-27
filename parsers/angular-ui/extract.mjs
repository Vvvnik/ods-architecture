/**
 * Angular 2+ UI landscape extract: apps, routes, screens from RouterModule /
 * Routes tables and provideRouter. Heuristic/regex — no TSC.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.angular',
  'out',
  'target',
]);

/**
 * @param {string} path
 */
export function posixPath(path) {
  return path.replace(/\\/g, '/');
}

/**
 * @param {string} workingCopyRoot
 * @param {string[]} files repo-relative paths (may be empty → walk WC)
 * @returns {Promise<{ apps: object[] }>}
 */
export async function extractUiTree(workingCopyRoot, files = []) {
  const root = workingCopyRoot;
  const fileSet = new Set((files ?? []).map((f) => posixPath(f)));
  const allFiles = fileSet.size > 0 ? [...fileSet] : await walkSourceFiles(root);

  let packageJsonPaths = allFiles.filter((f) => /(^|\/)package\.json$/i.test(f));
  if (packageJsonPaths.length === 0) {
    packageJsonPaths = await findPackageJsonFiles(root);
  }

  /** @type {object[]} */
  const apps = [];
  const seenRoots = new Set();

  for (const pkgRel of packageJsonPaths) {
    const appDir = posixPath(dirname(pkgRel));
    if (seenRoots.has(appDir)) continue;

    let pkg;
    try {
      pkg = JSON.parse(await readFile(join(root, pkgRel), 'utf8'));
    } catch {
      continue;
    }

    if (!hasAngularCore(pkg)) continue;

    let scoped =
      appDir === '.'
        ? allFiles
        : allFiles.filter((f) => f === appDir || f.startsWith(`${appDir}/`));

    if (fileSet.size > 0) {
      const walked = await walkSourceFiles(join(root, appDir === '.' ? '' : appDir), appDir === '.' ? '' : appDir);
      scoped = [...new Set([...scoped, ...walked])];
    } else if (scoped.length === 0) {
      scoped = await walkSourceFiles(join(root, appDir === '.' ? '' : appDir), appDir === '.' ? '' : appDir);
    }

    const routingFiles = findRoutingFiles(scoped);
    const hasAngularJson = scoped.some((f) => /(^|\/)angular\.json$/i.test(f));
    if (routingFiles.length === 0 && !hasAngularJson) {
      continue;
    }

    seenRoots.add(appDir);
    const app = await buildApp(root, appDir, pkg, scoped, routingFiles);
    if (app.routes.length === 0) {
      continue;
    }
    apps.push(app);
  }

  apps.sort((a, b) => (b.routes?.length ?? 0) - (a.routes?.length ?? 0));
  return { apps };
}

/**
 * @param {object} pkg
 */
function hasAngularCore(pkg) {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return Boolean(deps['@angular/core']);
}

/**
 * @param {string[]} scopedFiles
 */
export function findRoutingFiles(scopedFiles) {
  return scopedFiles
    .filter((f) => /\.ts$/i.test(f))
    .filter(
      (f) =>
        /(^|\/)[\w.-]*routing\.module\.ts$/i.test(f) ||
        /(^|\/)[\w.-]*\.routes\.ts$/i.test(f) ||
        /(^|\/)app\.routes\.ts$/i.test(f),
    )
    .sort((a, b) => {
      const aRoot = /app-routing\.module\.ts$/i.test(a) || /app\.routes\.ts$/i.test(a) ? 0 : 1;
      const bRoot = /app-routing\.module\.ts$/i.test(b) || /app\.routes\.ts$/i.test(b) ? 0 : 1;
      if (aRoot !== bRoot) return aRoot - bRoot;
      return a.localeCompare(b);
    });
}

/**
 * @param {string} root
 * @param {string} appDir
 * @param {object} pkg
 * @param {string[]} scopedFiles
 * @param {string[]} routingFiles
 */
async function buildApp(root, appDir, pkg, scopedFiles, routingFiles) {
  const entry_path = await findEntry(root, appDir);
  const language = scopedFiles.some((f) => /\.tsx?$/i.test(f)) ? 'typescript' : 'javascript';

  /** @type {object[]} */
  const routes = [];
  const seenKeys = new Set();

  for (const routerRel of routingFiles) {
    let content;
    try {
      content = await readFile(join(root, routerRel), 'utf8');
    } catch {
      continue;
    }
    if (!looksLikeAngularRouter(content, routerRel)) continue;

    for (const route of parseAngularRouteTable(content)) {
      if (route.path_pattern.includes('*')) continue;
      const screenName = route.element_name || route.load_hint || 'Screen';
      const stableRoute = routeStableKey(route.path_pattern, screenName);
      if (seenKeys.has(stableRoute)) continue;
      seenKeys.add(stableRoute);

      const source_path = route.component_path
        ? resolveRelative(routerRel, route.component_path)
        : routerRel;

      routes.push({
        stable_key: stableRoute,
        path_pattern: route.path_pattern,
        source_path: routerRel,
        screen: {
          stable_key: `screen:${screenName}`,
          name: screenName,
          component_name: screenName,
          source_path,
        },
      });
    }
  }

  const stable_key =
    appDir === '.' ? pkg.name || 'app' : appDir.split('/').filter(Boolean).pop() || pkg.name || 'app';

  return {
    stable_key,
    name: pkg.name || (appDir === '.' ? 'app' : appDir),
    framework: 'angular',
    language,
    entry_path: entry_path || undefined,
    modules: [],
    styles: [],
    flows: [],
    routes,
  };
}

/**
 * @param {string} content
 * @param {string} routerRel
 */
function looksLikeAngularRouter(content, routerRel) {
  if (/(^|\/)[\w.-]*routing\.module\.ts$/i.test(routerRel) || /\.routes\.ts$/i.test(routerRel)) {
    return true;
  }
  return (
    /RouterModule\.(forRoot|forChild)/.test(content) ||
    /provideRouter\s*\(/.test(content) ||
    /:\s*Routes\s*=/.test(content) ||
    /Routes\s*=\s*\[/.test(content)
  );
}

/**
 * Parse Angular Routes object literals: path + component | loadChildren | loadComponent.
 * @param {string} source
 * @returns {{ path_pattern: string, element_name: string|null, load_hint: string|null, component_path: string|null }[]}
 */
export function parseAngularRouteTable(source) {
  /** @type {{ path_pattern: string, element_name: string|null, load_hint: string|null, component_path: string|null }[]} */
  const routes = [];
  const importMap = parseImports(source);

  let i = 0;
  while (i < source.length) {
    if (source[i] === '{') {
      const end = matchBrace(source, i);
      if (end < 0) break;
      const block = source.slice(i, end + 1);
      const pathLit = block.match(/(?:^|[,{\s])path\s*:\s*['"`]([^'"`]*)['"`]/);
      if (pathLit) {
        const path_pattern = normalizeAbsPath(pathLit[1] === '' ? '/' : `/${pathLit[1]}`);
        const comp = block.match(/(?:^|[,{\s])component\s*:\s*([A-Za-z_$][\w$]*)/);
        const loadComp = block.match(
          /loadComponent\s*:\s*\(\)\s*=>\s*import\(\s*['"`]([^'"`]+)['"`]/,
        );
        const loadChild = block.match(
          /loadChildren\s*:\s*(?:\(\)\s*=>\s*)?import\(\s*['"`]([^'"`]+)['"`]/,
        );
        let element_name = comp ? comp[1] : null;
        let component_path = null;
        let load_hint = null;

        if (element_name && importMap[element_name]) {
          component_path = importMap[element_name];
        }
        if (!element_name && loadComp) {
          load_hint = hintFromModulePath(loadComp[1]);
          component_path = loadComp[1];
        }
        if (!element_name && !load_hint && loadChild) {
          load_hint = hintFromModulePath(loadChild[1]);
          component_path = loadChild[1];
        }

        if (element_name || load_hint) {
          if (path_pattern.includes('*')) {
            i = end + 1;
            continue;
          }
          routes.push({
            path_pattern,
            element_name,
            load_hint,
            component_path,
          });
        }
      }
      i = end + 1;
      continue;
    }
    i += 1;
  }

  return dedupeRoutes(routes);
}

/**
 * @param {string} modulePath
 */
function hintFromModulePath(modulePath) {
  const base = modulePath.split('/').filter(Boolean).pop() || 'Module';
  return base
    .replace(/\.(module|routes|component)$/i, '')
    .split(/[-_.]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

/**
 * @param {string} source
 */
function parseImports(source) {
  /** @type {Record<string, string>} */
  const map = {};
  const re =
    /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop()?.trim()).filter(Boolean);
    for (const name of names) {
      map[name] = m[2];
    }
  }
  return map;
}

/**
 * @param {string} fromFile
 * @param {string} importPath
 */
function resolveRelative(fromFile, importPath) {
  if (!importPath.startsWith('.')) {
    return importPath;
  }
  const dir = dirname(fromFile);
  const parts = [...dir.split('/').filter(Boolean), ...importPath.split('/')];
  /** @type {string[]} */
  const out = [];
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

/**
 * @param {string} path
 * @param {string} screenName
 */
function routeStableKey(path, screenName) {
  const slug = path.replace(/^\//, '').replace(/\//g, '.') || 'root';
  return `route:${slug}:${screenName}`;
}

/**
 * @param {string} path
 */
function normalizeAbsPath(path) {
  const parts = path.split('/').filter((p) => p && p !== '.');
  return `/${parts.join('/')}` || '/';
}

/**
 * @param {{ path_pattern: string, element_name: string|null, load_hint: string|null, component_path: string|null }[]} routes
 */
function dedupeRoutes(routes) {
  const seen = new Set();
  /** @type {typeof routes} */
  const out = [];
  for (const r of routes) {
    const key = `${r.path_pattern}|${r.element_name || r.load_hint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * @param {string} text
 * @param {number} start index of '{'
 */
function matchBrace(text, start) {
  let depth = 0;
  let inStr = null;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inStr) {
      if (ch === '\\') {
        i += 1;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inStr = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * @param {string} root
 * @param {string} appDir
 */
async function findEntry(root, appDir) {
  for (const c of ['src/main.ts', 'src/main.js', 'src/index.ts']) {
    const rel = appDir === '.' ? c : `${appDir}/${c}`;
    try {
      await stat(join(root, rel));
      return rel;
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * @param {string} absDir
 * @param {string} relPrefix
 */
async function walkSourceFiles(absDir, relPrefix = '') {
  /** @type {string[]} */
  const out = [];
  let entries;
  try {
    entries = await readdir(absDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    const abs = join(absDir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkSourceFiles(abs, rel)));
      continue;
    }
    if (!entry.isFile()) continue;
    if (/\.(ts|html|css|scss|json)$/i.test(entry.name) || entry.name === 'package.json') {
      out.push(posixPath(rel));
    }
  }
  return out;
}

/**
 * @param {string} root
 */
async function findPackageJsonFiles(root) {
  const files = await walkSourceFiles(root);
  return files.filter((f) => /(^|\/)package\.json$/i.test(f));
}
