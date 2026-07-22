/**
 * React UI landscape extract (020): apps, routes, screens, styles, surfaces,
 * controls, API calls, and analysis-confirm flows. Heuristic/regex — no TSC.
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.vite',
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

  const apps = [];
  const packageJsonPaths = allFiles.filter((f) => /(^|\/)package\.json$/i.test(f));

  if (packageJsonPaths.length === 0) {
    packageJsonPaths.push(...(await findPackageJsonFiles(root)));
  }

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

    if (!hasReactDep(pkg)) continue;

    const score = await scoreSpaRoot(root, appDir);
    if (score < 0) continue;

    seenRoots.add(appDir);
    const appFiles = allFiles.filter(
      (f) => f === appDir || f.startsWith(`${appDir}/`) || appDir === '.',
    );

    let scoped = appFiles.length > 0 ? appFiles : await walkSourceFiles(join(root, appDir), appDir);
    if (appDir === '.') {
      scoped = allFiles;
    }

    // When files list is partial, still walk the app dir for routers/pages
    const needsWalk =
      !scoped.some((f) => /(^|\/)(router|routes)\.tsx?$/i.test(f)) ||
      !scoped.some((f) => /\/pages\//i.test(f));
    if (fileSet.size > 0 && needsWalk) {
      const walked = await walkSourceFiles(join(root, appDir === '.' ? '' : appDir), appDir === '.' ? '' : appDir);
      const merged = new Set([...scoped, ...walked]);
      scoped = [...merged];
    }

    apps.push(await buildApp(root, appDir, pkg, scoped, score));
  }

  apps.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
  for (const app of apps) {
    delete app._score;
  }

  return { apps };
}

/**
 * @param {object} pkg
 */
function hasReactDep(pkg) {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  return Boolean(deps.react);
}

/**
 * @param {string} root
 * @param {string} appDir posix relative
 */
async function scoreSpaRoot(root, appDir) {
  let score = 1;
  const candidates = [
    'src/main.tsx',
    'src/main.jsx',
    'src/index.tsx',
    'src/index.jsx',
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mjs',
  ];
  for (const c of candidates) {
    const rel = appDir === '.' ? c : `${appDir}/${c}`;
    try {
      await stat(join(root, rel));
      score += c.includes('vite') ? 2 : 3;
    } catch {
      /* missing */
    }
  }
  return score;
}

/**
 * @param {string} root
 * @param {string} appDir
 * @param {object} pkg
 * @param {string[]} scopedFiles
 * @param {number} score
 */
async function buildApp(root, appDir, pkg, scopedFiles, score) {
  const entry_path = await findEntry(root, appDir);
  const language = scopedFiles.some((f) => /\.tsx?$/i.test(f)) ? 'typescript' : 'javascript';

  /** @type {Map<string, object>} */
  const stylesByKey = new Map();
  /** @type {object[]} */
  const routes = [];
  /** @type {object[]} */
  const modules = [];

  const apiIndex = await indexApiModules(root, scopedFiles);
  const routerFiles = findRouterFiles(scopedFiles);

  for (const routerRel of routerFiles) {
    let content;
    try {
      content = await readFile(join(root, routerRel), 'utf8');
    } catch {
      continue;
    }
    const looksLikeRouter =
      /createBrowserRouter|createHashRouter|createRoutesFromElements|<Routes\b/.test(content) ||
      /(^|\/)(router|routes)\.tsx?$/i.test(routerRel);
    if (!looksLikeRouter) continue;

    const importMap = parseImports(content, routerRel);
    const parsed = parseRouteTable(content);
    for (const route of parsed) {
      if (route.path_pattern.includes('*')) continue;
      if (route.element_name === 'Navigate') continue;

      const resolved = await resolveScreenComponent(
        root,
        route.element_name,
        importMap,
        routerRel,
      );

      const screenName = resolved.component_name || route.element_name || 'Screen';
      const stableRoute = routeStableKey(route.path_pattern, screenName);
      const screen = await buildScreen(root, {
        screenName,
        source_path: resolved.source_path,
        routerRel,
        stylesByKey,
        apiIndex,
      });

      routes.push({
        stable_key: stableRoute,
        path_pattern: route.path_pattern,
        source_path: routerRel,
        screen,
      });
    }
  }

  const prefix = appDir === '.' ? '' : `${appDir}/`;
  for (const f of scopedFiles) {
    const m = f.match(new RegExp(`^${escapeRegExp(prefix)}src/components/([^/]+)/`));
    if (m) {
      const key = m[1];
      if (!modules.some((x) => x.stable_key === key)) {
        modules.push({
          stable_key: key,
          name: key,
          path: `${prefix}src/components/${key}`,
        });
      }
    }
  }

  const flows = await detectAnalysisConfirmFlow(root, scopedFiles, apiIndex);

  return {
    _score: score,
    stable_key: appDir === '.' ? pkg.name || 'app' : appDir.split('/').filter(Boolean).pop(),
    name: pkg.name || (appDir === '.' ? 'app' : appDir),
    framework: 'react',
    language,
    entry_path: entry_path || undefined,
    modules,
    styles: [...stylesByKey.values()],
    flows,
    routes,
  };
}

/**
 * @param {string} root
 * @param {string} appDir
 */
async function findEntry(root, appDir) {
  for (const c of ['src/main.tsx', 'src/main.jsx', 'src/index.tsx', 'src/index.jsx']) {
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
 * @param {string[]} scopedFiles
 */
function findRouterFiles(scopedFiles) {
  const byName = scopedFiles.filter((f) => /(^|\/)(router|routes)\.tsx?$/i.test(f));
  if (byName.length) return byName;
  return scopedFiles.filter((f) => /\.(tsx|jsx)$/i.test(f));
}

/**
 * @param {string} source
 */
function parseRouteTable(source) {
  /** @type {{ path_pattern: string, element_name: string|null }[]} */
  const routes = [];
  collectRoutesFromText(source, '', routes);
  return dedupeRoutes(routes);
}

/**
 * @param {string} text
 * @param {string} parentPath
 * @param {{ path_pattern: string, element_name: string|null }[]} out
 */
function collectRoutesFromText(text, parentPath, out) {
  let i = 0;
  while (i < text.length) {
    if (text[i] === '{') {
      const end = matchBrace(text, i);
      if (end < 0) break;
      const block = text.slice(i, end + 1);
      const hasPath = /(?:^|[,{\s])path\s*:/.test(block);
      const hasIndex = /(?:^|[,{\s])index\s*:\s*true/.test(block);
      if (hasPath || hasIndex) {
        const pathLit = block.match(/path\s*:\s*['"`]([^'"`]+)['"`]/);
        const el = block.match(/element\s*:\s*<([A-Za-z_$][\w$]*)/);
        const segment = hasIndex ? '' : pathLit ? pathLit[1] : null;
        if (segment !== null) {
          const abs = joinRoutePath(parentPath, segment);
          out.push({ path_pattern: abs, element_name: el ? el[1] : null });
        }
        const childrenIdx = block.search(/children\s*:\s*\[/);
        if (childrenIdx >= 0) {
          const bracketStart = block.indexOf('[', childrenIdx);
          const childrenEnd = matchBracket(block, bracketStart);
          if (childrenEnd > bracketStart) {
            const childParent = segment !== null ? joinRoutePath(parentPath, segment) : parentPath;
            collectRoutesFromText(block.slice(bracketStart, childrenEnd + 1), childParent, out);
          }
        }
      }
      i = end + 1;
      continue;
    }
    i += 1;
  }
}

/**
 * @param {string} parent
 * @param {string} segment
 */
function joinRoutePath(parent, segment) {
  if (!segment) {
    return parent || '/';
  }
  if (segment.startsWith('/')) {
    return normalizeAbsPath(segment);
  }
  const base = !parent || parent === '/' ? '' : parent.replace(/\/$/, '');
  return normalizeAbsPath(`${base}/${segment}`);
}

/**
 * @param {string} path
 */
function normalizeAbsPath(path) {
  const parts = path.split('/').filter((p) => p && p !== '.');
  return `/${parts.join('/')}` || '/';
}

/**
 * @param {string} s
 * @param {number} openIdx
 */
function matchBrace(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i += 1) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(s, i);
      continue;
    }
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * @param {string} s
 * @param {number} openIdx
 */
function matchBracket(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i += 1) {
    const c = s[i];
    if (c === '"' || c === "'" || c === '`') {
      i = skipString(s, i);
      continue;
    }
    if (c === '[') depth += 1;
    else if (c === ']') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * @param {string} s
 * @param {number} i
 */
function skipString(s, i) {
  const q = s[i];
  i += 1;
  while (i < s.length) {
    if (s[i] === '\\') {
      i += 2;
      continue;
    }
    if (s[i] === q) return i;
    i += 1;
  }
  return s.length - 1;
}

/**
 * @param {{ path_pattern: string, element_name: string|null }[]} routes
 */
function dedupeRoutes(routes) {
  const seen = new Set();
  const out = [];
  for (const r of routes) {
    const key = `${r.path_pattern}::${r.element_name || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/**
 * @param {string} pathPattern
 * @param {string} screenName
 */
function routeStableKey(pathPattern, screenName) {
  const p = pathPattern.replace(/\/+$/, '') || '/';
  if (p === '/') return 'root';
  if (/graph-ui$/i.test(p)) return 'graph-ui';
  if (/graph-view$/i.test(p)) return 'graph-view';
  if (/\/graph$/i.test(p) || p === '/graph') return p === '/graph' ? 'graph-legacy' : 'graph';
  if (/\/projects\/:[^/]+$/i.test(p)) return 'workspace';
  if (/\/projects$/i.test(p)) return 'projects';
  if (/\/import$/i.test(p)) return 'import';
  const leaf = p.split('/').filter(Boolean).pop() || 'route';
  if (screenName && screenName !== 'Navigate' && screenName !== 'AppLayout') {
    const fromScreen = screenName
      .replace(/Page$/, '')
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    if (fromScreen && fromScreen !== 'app-layout') return fromScreen;
  }
  return leaf.replace(/:/g, '');
}

/**
 * @param {string} source
 * @param {string} fromFile
 */
function parseImports(source, fromFile) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const re =
    /import\s+(?:type\s+)?(?:\{([^}]+)\}|([A-Za-z_$][\w$]*))\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(source))) {
    const spec = m[3];
    if (m[1]) {
      for (const part of m[1].split(',')) {
        const bits = part.trim().split(/\s+as\s+/);
        const orig = (bits[0] || '').trim();
        const imported = (bits[1] || bits[0] || '').trim();
        if (!imported) continue;
        const resolved = resolveImportPath(fromFile, spec);
        map.set(imported, resolved);
        if (orig && orig !== imported) map.set(orig, resolved);
      }
    } else if (m[2]) {
      map.set(m[2], resolveImportPath(fromFile, spec));
    }
  }
  return map;
}

/**
 * @param {string} fromFile
 * @param {string} spec
 */
function resolveImportPath(fromFile, spec) {
  if (!spec.startsWith('.')) return spec;
  const base = dirname(fromFile);
  let resolved = posixPath(join(base, spec));
  resolved = resolved.replace(/\\/g, '/');
  resolved = resolved.replace(/\.(js|jsx|mjs|cjs)$/i, '');
  return resolved;
}

/**
 * @param {string} root
 * @param {string|null} elementName
 * @param {Map<string, string>} importMap
 * @param {string} routerRel
 */
async function resolveScreenComponent(root, elementName, importMap, routerRel) {
  if (!elementName || elementName === 'Navigate') {
    return { component_name: elementName || 'Unknown', source_path: routerRel, importMap };
  }

  const pathHint = importMap.get(elementName);
  let source_path = await resolveExistingSource(root, pathHint);
  let component_name = elementName;
  let nestedMap = importMap;

  if (source_path) {
    let content = '';
    try {
      content = await readFile(join(root, source_path), 'utf8');
    } catch {
      content = '';
    }
    nestedMap = parseImports(content, source_path);
    const fnBody = extractExportedFunctionBody(content, elementName) || content;
    const inner = findReturnedPageComponent(fnBody, nestedMap);
    if (inner) {
      component_name = inner;
      const innerPath = await resolveExistingSource(root, nestedMap.get(inner));
      if (innerPath) {
        source_path = innerPath;
        try {
          const innerContent = await readFile(join(root, innerPath), 'utf8');
          nestedMap = parseImports(innerContent, innerPath);
        } catch {
          /* keep */
        }
      }
    }
  }

  return { component_name, source_path: source_path || routerRel, importMap: nestedMap };
}

/**
 * @param {string} source
 * @param {string} name
 */
function extractExportedFunctionBody(source, name) {
  const re = new RegExp(
    `(?:export\\s+)?function\\s+${escapeRegExp(name)}\\s*\\([^)]*\\)\\s*\\{`,
  );
  const m = re.exec(source);
  if (!m) return null;
  const openIdx = source.indexOf('{', m.index + m[0].length - 1);
  const end = matchBrace(source, openIdx);
  if (end < 0) return null;
  return source.slice(openIdx, end + 1);
}

/**
 * Prefer Page components returned from a thin wrapper (e.g. ProjectGraphPage → GraphPage).
 * Do not substitute layout shells (WorkspaceLayout) or providers.
 * @param {string} body
 * @param {Map<string, string>} importMap
 */
function findReturnedPageComponent(body, importMap) {
  const re = /return\s*(?:\()\s*<([A-Za-z_$][\w$]*)\b|return\s+<([A-Za-z_$][\w$]*)\b/g;
  let m;
  /** @type {string[]} */
  const found = [];
  while ((m = re.exec(body))) {
    const name = m[1] || m[2];
    if (name && name !== 'Navigate') found.push(name);
  }
  for (const name of found) {
    if (importMap.has(name) && /Page$/.test(name)) return name;
  }
  return null;
}

/**
 * @param {string} root
 * @param {string|undefined} hint
 */
async function resolveExistingSource(root, hint) {
  if (!hint || hint.startsWith('@') || (!hint.includes('/') && !hint.includes('\\'))) {
    return null;
  }
  const candidates = [
    hint,
    `${hint}.tsx`,
    `${hint}.ts`,
    `${hint}.jsx`,
    `${hint}.js`,
    `${hint}/index.tsx`,
    `${hint}/index.ts`,
  ];
  for (const c of candidates) {
    try {
      await stat(join(root, c));
      return posixPath(c);
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * @param {string} root
 * @param {object} opts
 */
async function buildScreen(root, opts) {
  const { screenName, source_path, routerRel, stylesByKey, apiIndex } = opts;

  /** @type {object} */
  const screen = {
    stable_key: screenName,
    name: humanizeScreenName(screenName),
    component_name: screenName,
    source_path: source_path || routerRel,
    frames: [{ stable_key: 'main', role: 'main', name: 'Main' }],
    components: [],
    style_keys: [],
    navigations: [],
  };

  let content = '';
  try {
    content = await readFile(join(root, source_path), 'utf8');
  } catch {
    return screen;
  }

  const styleImports = [
    ...content.matchAll(/import\s+\w+\s+from\s+['"]([^'"]+\.module\.css)['"]/g),
    ...content.matchAll(/import\s+['"]([^'"]+\.css)['"]/g),
  ];
  for (const m of styleImports) {
    const spec = m[1];
    const abs = await resolveExistingSource(
      root,
      resolveImportPath(source_path, spec.replace(/\?.*$/, '')),
    );
    const stylePath = abs || posixPath(join(dirname(source_path), spec));
    const kind = /\.module\.css$/i.test(spec) ? 'css_module' : 'global_css';
    const key = styleKeyFromPath(stylePath);
    if (!stylesByKey.has(key)) {
      stylesByKey.set(key, { stable_key: key, path: stylePath, kind });
    }
    if (!screen.style_keys.includes(key)) screen.style_keys.push(key);
  }

  const pathToRouteKey = (to) => {
    const cleaned = to.replace(/\$\{[^}]+\}/g, ':param');
    return routeStableKey(normalizeAbsPath(cleaned.startsWith('/') ? cleaned : `/${cleaned}`), '');
  };

  const navRe =
    /<(?:Link|NavLink)\b[^>]*\bto\s*=\s*(?:\{\s*)?['"`]([^'"`]+)['"`]/g;
  let nm;
  while ((nm = navRe.exec(content))) {
    screen.navigations.push({ to_route_key: pathToRouteKey(nm[1]), via: 'link' });
  }
  const navCallRe = /\bnavigate\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((nm = navCallRe.exec(content))) {
    screen.navigations.push({ to_route_key: pathToRouteKey(nm[1]), via: 'navigate' });
  }
  // navigate(`/projects/${id}`) — map to workspace
  const navTmplRe = /\bnavigate\s*\(\s*`([^`]+)`/g;
  while ((nm = navTmplRe.exec(content))) {
    screen.navigations.push({ to_route_key: pathToRouteKey(nm[1]), via: 'navigate' });
  }
  screen.navigations = dedupeNav(screen.navigations);

  /** @type {object[]} */
  const surfaces = [];
  const considerSurface = (text) => {
    if (/@xyflow\/react|\bReactFlow\b/.test(text) && !surfaces.some((s) => s.surface_kind === 'canvas')) {
      surfaces.push({
        stable_key: 'react-flow-canvas',
        surface_kind: 'canvas',
        library: '@xyflow/react',
      });
      screen.frames.push({ stable_key: 'canvas', role: 'canvas', name: 'React Flow canvas' });
    }
    if (
      /codemirror|@codemirror\/|\bEditorView\b|\bEditorState\b/.test(text) &&
      !surfaces.some((s) => s.surface_kind === 'code_viewer')
    ) {
      surfaces.push({
        stable_key: 'codemirror-viewer',
        surface_kind: 'code_viewer',
        library: 'codemirror',
      });
      screen.frames.push({ stable_key: 'viewer', role: 'viewer', name: 'CodeMirror viewer' });
    }
  };
  considerSurface(content);

  const localImports = parseImports(content, source_path);
  for (const [, hint] of localImports) {
    const depPath = await resolveExistingSource(root, hint);
    if (!depPath) continue;
    try {
      considerSurface(await readFile(join(root, depPath), 'utf8'));
    } catch {
      /* skip */
    }
  }
  if (surfaces.length) screen.surfaces = surfaces;

  const controls = extractControls(content, source_path);
  if (controls.length) {
    const hasForm = /<form\b/i.test(content);
    screen.components.push({
      stable_key: `${screenName}-ui`,
      name: `${humanizeScreenName(screenName)} UI`,
      kind_hint: hasForm ? 'form' : 'other',
      source_path,
      controls,
    });
  }

  const apiCalls = collectApiCallsForScreen(content, source_path, apiIndex);
  if (apiCalls.length) {
    screen.components.push({
      stable_key: `${screenName}-api`,
      name: `${humanizeScreenName(screenName)} API`,
      kind_hint: 'other',
      source_path,
      controls: apiCalls.map((call, idx) => ({
        stable_key: `api-${call.method}-${slug(call.path_template)}-${idx}`,
        control_kind: 'other',
        name: `${call.method} ${call.path_template}`,
        api_calls: [call],
        source_path,
      })),
    });
  }

  const qp = new Set();
  for (const m of content.matchAll(/searchParams\.get\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    qp.add(m[1]);
  }
  if (qp.size) screen.query_params = [...qp];

  return screen;
}

/**
 * @param {string} content
 * @param {string} source_path
 */
function extractControls(content, source_path) {
  /** @type {object[]} */
  const controls = [];
  const tagStart = /<(button|input|select)\b/gi;
  let m;
  let idx = 0;
  const used = new Set();
  while ((m = tagStart.exec(content))) {
    const tag = m[1].toLowerCase();
    const open = readJsxOpenTag(content, m.index + m[0].length);
    if (!open) continue;
    const attrs = open.attrs;
    const inner = open.selfClosing
      ? ''
      : readJsxElementInner(content, open.end + 1, tag);
    const nameAttr = attrs.match(/\bname\s*=\s*['"`]([^'"`]+)['"`]/);
    const typeAttr = attrs.match(/\btype\s*=\s*['"`]([^'"`]+)['"`]/);
    let control_kind = tag === 'button' ? 'button' : tag === 'select' ? 'select' : 'input';
    if (tag === 'input' && typeAttr) {
      const t = typeAttr[1].toLowerCase();
      if (t === 'checkbox') control_kind = 'checkbox';
      else if (t === 'submit') control_kind = 'button';
    }
    let stable = controlStableKey(control_kind, attrs, inner, idx);
    if (used.has(stable)) {
      stable = `${stable}-${idx}`;
    }
    used.add(stable);
    /** @type {object} */
    const ctrl = {
      stable_key: stable,
      control_kind,
      name: humanizeControlName(stable, control_kind),
      source_path,
    };
    if (nameAttr) {
      ctrl.field_name = nameAttr[1];
    }
    controls.push(ctrl);
    idx += 1;
    tagStart.lastIndex = open.end + 1;
  }
  return controls;
}

/**
 * Read JSX open-tag attributes without stopping at `>` inside `{...}` / quotes
 * (e.g. onChange={(e) => ...}).
 * @param {string} content
 * @param {number} from index right after `<tag`
 */
function readJsxOpenTag(content, from) {
  let i = from;
  let depth = 0;
  let quote = null;
  while (i < content.length) {
    const ch = content[i];
    if (quote) {
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i += 1;
      continue;
    }
    if (ch === '{') {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === '}') {
      depth = Math.max(0, depth - 1);
      i += 1;
      continue;
    }
    if (depth === 0 && ch === '/' && content[i + 1] === '>') {
      return { attrs: content.slice(from, i), end: i + 1, selfClosing: true };
    }
    if (depth === 0 && ch === '>') {
      return { attrs: content.slice(from, i), end: i, selfClosing: false };
    }
    i += 1;
  }
  return null;
}

/**
 * @param {string} content
 * @param {number} from
 * @param {string} tag
 */
function readJsxElementInner(content, from, tag) {
  const close = new RegExp(`</${tag}\\s*>`, 'i');
  close.lastIndex = from;
  const m = close.exec(content);
  if (!m) return '';
  return content.slice(from, m.index);
}

/**
 * Prefer functional keys (button-enter, select-layer) over button-0.
 * @param {string} controlKind
 * @param {string} attrs
 * @param {string} inner
 * @param {number} idx
 */
function controlStableKey(controlKind, attrs, inner, idx) {
  const nameAttr = attrs.match(/\bname\s*=\s*['"`]([^'"`]+)['"`]/);
  if (nameAttr) return nameAttr[1];

  const idAttr = attrs.match(/\bid\s*=\s*['"`]([^'"`]+)['"`]/);
  if (idAttr) return idAttr[1];

  const aria = attrs.match(/\baria-label\s*=\s*\{?['"`]([^'"`]+)['"`]\}?/);
  if (aria) return `${controlKind}-${slug(aria[1])}`;

  const ariaExpr = attrs.match(/\baria-label\s*=\s*\{([^}]+)\}/);
  if (ariaExpr) {
    const fromMsg = ariaExpr[1].match(/\.([A-Za-z][A-Za-z0-9_]*)\b/);
    if (fromMsg) {
      const raw = fromMsg[1]
        .replace(/^GRAPH_UI_/, '')
        .replace(/^GRAPH_VIEW_/, '')
        .replace(/^GRAPH_/, '');
      const key = /^[A-Z0-9_]+$/.test(raw)
        ? raw.toLowerCase().replace(/_/g, '-')
        : camelToKebab(raw.replace(/^action/, '') || raw);
      if (key === 'language') return `${controlKind}-language`;
      return `${controlKind}-${key}`;
    }
  }

  const titleExpr = attrs.match(/\btitle\s*=\s*\{([^}]+)\}/);
  if (titleExpr) {
    const fromMsg = titleExpr[1].match(/\.([A-Za-z][A-Za-z0-9_]*)\b/);
    if (fromMsg) {
      const raw = fromMsg[1].replace(/^action/, '');
      const key = /^[A-Z0-9_]+$/.test(raw)
        ? raw.toLowerCase().replace(/_/g, '-')
        : camelToKebab(raw);
      return `${controlKind}-${key}`;
    }
  }

  const valueIdent = attrs.match(/\bvalue\s*=\s*\{([A-Za-z_][A-Za-z0-9_]*)\}/);
  if (valueIdent) {
    const v = valueIdent[1];
    if (v === 'locale') return `${controlKind}-language`;
    if (v === 'layerFilter') return `${controlKind}-layer`;
    if (v === 'sourceType') return `${controlKind}-source-type`;
    return `${controlKind}-${camelToKebab(v)}`;
  }

  const handler =
    attrs.match(/\bonClick\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{]*)*)\}/) ||
    attrs.match(/\bonChange\s*=\s*\{([^{}]*(?:\{[^{}]*\}[^{]*)*)\}/);
  if (handler) {
    const role = handlerRole(handler[1]);
    if (role) return `${controlKind}-${role}`;
  }

  const plain = inner.match(/^\s*([A-Za-z][A-Za-z0-9 _-]{0,40})\s*$/);
  if (plain) return `${controlKind}-${slug(plain[1])}`;

  const msgChild = inner.match(/\{(?:messages\.)?([A-Za-z][A-Za-z0-9_]*)\}/);
  if (msgChild) {
    const raw = msgChild[1]
      .replace(/^GRAPH_UI_/, '')
      .replace(/^GRAPH_VIEW_/, '')
      .replace(/^GRAPH_/, '');
    const key = /^[A-Z0-9_]+$/.test(raw)
      ? raw.toLowerCase().replace(/_/g, '-')
      : camelToKebab(raw);
    return `${controlKind}-${key}`;
  }

  return `${controlKind}-${idx}`;
}

/**
 * @param {string} expr
 */
function handlerRole(expr) {
  const map = {
    goUp: 'up',
    onUp: 'up',
    onEnter: 'enter',
    onConfirm: 'confirm',
    onCancel: 'cancel',
    enterCode: 'enter-code',
    clearToast: 'dismiss',
    runSearch: 'search',
    refetch: 'retry',
    clearDeleteError: 'dismiss-error',
    handleSubmit: 'submit',
    triggerSync: 'sync',
    confirmAndDelete: 'delete',
  };
  for (const [fn, role] of Object.entries(map)) {
    if (new RegExp(`\\b${fn}\\b`).test(expr)) return role;
  }
  const setLocale = /\bsetLocale\b/.test(expr);
  if (setLocale) return 'language';
  const setLayer = /\bsetLayerFilter\b/.test(expr);
  if (setLayer) return 'layer';
  const setSource = /\bsetSourceType\b/.test(expr);
  if (setSource) return 'source-type';
  // onClick={triggerSync} or onClick={() => foo(...)}
  const bare = expr.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*$/);
  if (bare) return camelToKebab(bare[1].replace(/^on/, '').replace(/^set/, '') || bare[1]);
  const named = expr.match(/\b([a-z][a-zA-Z0-9]*)\s*\(/);
  if (named && !['encodeURIComponent', 'Boolean', 'String'].includes(named[1])) {
    return camelToKebab(named[1].replace(/^on/, '').replace(/^set/, '') || named[1]);
  }
  return null;
}

/**
 * @param {string} stable
 * @param {string} controlKind
 */
function humanizeControlName(stable, controlKind) {
  if (stable.startsWith(`${controlKind}-`)) {
    return humanizeScreenName(
      stable
        .slice(controlKind.length + 1)
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(''),
    );
  }
  return stable;
}

/**
 * @param {string} name
 */
function camelToKebab(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();
}

/**
 * @param {string} content
 * @param {string} source_path
 * @param {Map<string, Map<string, object[]>>} apiIndex modulePath → exportName → calls
 */
function collectApiCallsForScreen(content, source_path, apiIndex) {
  /** @type {object[]} */
  const calls = [];
  const seen = new Set();

  // Named imports: import { foo as bar } from '../api/graph'
  const namedRe =
    /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = namedRe.exec(content))) {
    const spec = m[2];
    if (!/(^|\/)api(\/|$)/.test(spec) && !spec.includes('/api/')) {
      // still resolve against index by path
    }
    const hint = resolveImportPath(source_path, spec);
    const modPath = resolveApiIndexKey(apiIndex, hint);
    if (!modPath) continue;
    const byExport = apiIndex.get(modPath);
    if (!byExport) continue;

    for (const part of m[1].split(',')) {
      const bits = part.trim().split(/\s+as\s+/);
      const exportName = (bits[0] || '').trim();
      const localName = (bits[1] || bits[0] || '').trim();
      if (!exportName || !localName || exportName === 'type') continue;
      // Named import from an api module binds that helper to the screen
      // (do not pull every export from the whole module file).
      for (const call of byExport.get(exportName) || byExport.get(localName) || []) {
        const key = `${call.method}:${call.path_template}`;
        if (seen.has(key)) continue;
        seen.add(key);
        calls.push({ method: call.method, path_template: call.path_template, body_fields: call.body_fields });
      }
    }
  }

  // Also inline apiFetch/fetch in the screen itself
  for (const call of extractApiCallsFromBody(content)) {
    const key = `${call.method}:${call.path_template}`;
    if (seen.has(key)) continue;
    seen.add(key);
    calls.push(call);
  }

  return calls;
}

/**
 * @param {Map<string, Map<string, object[]>>} apiIndex
 * @param {string} hint
 */
function resolveApiIndexKey(apiIndex, hint) {
  for (const k of apiIndex.keys()) {
    const base = k.replace(/\.(ts|tsx|js|jsx)$/, '');
    if (hint === base || hint === k || posixPath(hint) === base) {
      return k;
    }
  }
  return null;
}

/**
 * @param {string} root
 * @param {string[]} scopedFiles
 * @returns {Promise<Map<string, Map<string, object[]>>>}
 */
async function indexApiModules(root, scopedFiles) {
  /** @type {Map<string, Map<string, object[]>>} */
  const index = new Map();
  const apiFiles = scopedFiles.filter(
    (f) =>
      /\/api\/[^/]+\.(ts|js)$/i.test(f) &&
      !/\.test\./i.test(f) &&
      !/(^|\/)(types|models|graph-types|analysis-types)\.ts$/i.test(f),
  );
  for (const rel of apiFiles) {
    let content;
    try {
      content = await readFile(join(root, rel), 'utf8');
    } catch {
      continue;
    }
    /** @type {Map<string, object[]>} */
    const byExport = new Map();
    for (const call of extractApiCallsFromSource(content)) {
      const exportName = call.export_name || '';
      if (!exportName) continue;
      const list = byExport.get(exportName) ?? [];
      list.push({
        method: call.method,
        path_template: call.path_template,
        body_fields: call.body_fields,
      });
      byExport.set(exportName, list);
    }
    index.set(rel, byExport);
  }
  return index;
}

/**
 * @param {string} content
 */
export function extractApiCallsFromSource(content) {
  /** @type {object[]} */
  const calls = [];
  const exportFnRe = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = exportFnRe.exec(content))) {
    const exportName = m[1];
    const paramsOpen = m.index + m[0].length - 1;
    const paramsClose = matchParen(content, paramsOpen);
    if (paramsClose < 0) continue;
    const braceStart = content.indexOf('{', paramsClose);
    if (braceStart < 0) continue;
    // Avoid jumping into a following export if return-type parsing failed.
    const between = content.slice(paramsClose, braceStart);
    if (between.includes('export ')) continue;
    const braceEnd = matchBrace(content, braceStart);
    if (braceEnd < 0) continue;
    const body = content.slice(braceStart, braceEnd + 1);
    for (const call of extractApiCallsFromBody(body)) {
      calls.push({ ...call, export_name: exportName });
    }
  }

  // export const foo = async (...) => { ... }
  const exportConstRe =
    /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{/g;
  while ((m = exportConstRe.exec(content))) {
    const exportName = m[1];
    const braceStart = content.indexOf('{', m.index + m[0].length - 1);
    if (braceStart < 0) continue;
    const braceEnd = matchBrace(content, braceStart);
    if (braceEnd < 0) continue;
    const body = content.slice(braceStart, braceEnd + 1);
    for (const call of extractApiCallsFromBody(body)) {
      calls.push({ ...call, export_name: exportName });
    }
  }

  return calls;
}

/**
 * @param {string} s
 * @param {number} openIdx index of '('
 */
function matchParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i += 1) {
    const ch = s[i];
    if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * @param {string} content
 */
function extractApiCallsFromBody(content) {
  /** @type {object[]} */
  const calls = [];
  const seen = new Set();

  const fetchRe =
    /\b(?:apiFetch|fetch)\s*(?:<[^>]*>)?\s*\(\s*(['"`])([^'"`]*?)\1/g;
  let m;
  while ((m = fetchRe.exec(content))) {
    const path_template = normalizeApiPath(m[2]);
    if (!path_template) continue;
    const window = content.slice(m.index, m.index + 180);
    const methodMatch = window.match(/method\s*:\s*['"`](\w+)['"`]/);
    const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();
    const key = `${method}:${path_template}`;
    if (seen.has(key)) continue;
    seen.add(key);
    /** @type {object} */
    const call = { method, path_template };
    const bodyFields = extractBodyFieldsNear(content, m.index);
    if (bodyFields.length) call.body_fields = bodyFields;
    calls.push(call);
  }

  const tmplRe = /\b(?:apiFetch|fetch)\s*(?:<[^>]*>)?\s*\(\s*`([^`]+)`/g;
  while ((m = tmplRe.exec(content))) {
    const path_template = normalizeApiPath(m[1]);
    if (!path_template) continue;
    const window = content.slice(m.index, m.index + 180);
    const methodMatch = window.match(/method\s*:\s*['"`](\w+)['"`]/);
    const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();
    const key = `${method}:${path_template}`;
    if (seen.has(key)) continue;
    seen.add(key);
    calls.push({ method, path_template });
  }

  return calls;
}

/**
 * @param {string} content
 * @param {number} at
 */
function extractBodyFieldsNear(content, at) {
  const slice = content.slice(Math.max(0, at - 400), at + 200);
  const fields = new Set();
  for (const m of slice.matchAll(
    /\b(source_type|source_value|name|status|languages|force)\s*:/g,
  )) {
    fields.add(m[1]);
  }
  return [...fields];
}

/**
 * @param {string} raw
 */
function normalizeApiPath(raw) {
  let p = String(raw).trim().split('?')[0];
  // Drop query builders glued onto path templates: `${buildQuery(...)}`
  p = p.replace(/\$\{buildQuery\((?:[^()]|\([^)]*\))*\)\}/g, '');
  p = p.replace(/\$\{(?:[^{}]|\{[^}]*\})*\}/g, '{id}');
  const pathMatch = p.match(/(\/api\/v1\/[A-Za-z0-9_/{}.:-]*|\/[A-Za-z0-9_/{}.:-]+)/);
  p = pathMatch ? pathMatch[1] : p;
  p = p.replace(/\/api\/v1/i, '');
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\{+id\}+/g, '{id}');
  p = p.replace(/[^A-Za-z0-9_/{}.:-]+$/g, '');
  return p === '/' ? '' : p;
}

/**
 * @param {string} root
 * @param {string[]} scopedFiles
 * @param {Map<string, object[]>} apiIndex
 */
async function detectAnalysisConfirmFlow(root, scopedFiles, apiIndex) {
  const hasLang = scopedFiles.some((f) => /LanguagesConfirmModal\.(tsx|jsx|ts|js)$/i.test(f));
  const hasChanges = scopedFiles.some((f) => /ChangesConfirm(Modal)?\.(tsx|jsx|ts|js)$/i.test(f));
  const provider = scopedFiles.find((f) => /AnalysisProvider\.(tsx|jsx)$/i.test(f));

  let providerContent = '';
  if (provider) {
    try {
      providerContent = await readFile(join(root, provider), 'utf8');
    } catch {
      providerContent = '';
    }
  }

  const mentionsLang = hasLang || /LanguagesConfirmModal/.test(providerContent);
  const mentionsChanges = hasChanges || /ChangesConfirm/.test(providerContent);
  if (!mentionsLang && !mentionsChanges) return [];

  /** @type {string[]} */
  const flowSteps = [];
  if (mentionsLang) flowSteps.push('LanguagesConfirmModal');
  if (mentionsChanges) flowSteps.push('ChangesConfirmModal');
  flowSteps.push('progress');

  /** @type {object[]} */
  const api_calls = [];
  for (const [mod, byExport] of apiIndex) {
    if (!/\/api\/analysis\./i.test(mod)) continue;
    for (const modCalls of byExport.values()) {
      for (const call of modCalls) {
        if (/analysis\/runs/i.test(call.path_template)) api_calls.push(call);
      }
    }
  }

  /** @type {object} */
  const flow = {
    stable_key: 'analysis-confirm',
    name: 'Analysis confirm',
    steps: flowSteps,
    source_path:
      provider ||
      scopedFiles.find((f) => /LanguagesConfirmModal/.test(f)) ||
      scopedFiles.find((f) => /ChangesConfirm/.test(f)),
  };
  if (api_calls.length) flow.api_calls = api_calls;
  return [flow];
}

/**
 * @param {string} name
 */
function humanizeScreenName(name) {
  return (
    name
      .replace(/Page$/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim() || name
  );
}

/**
 * @param {string} path
 */
function styleKeyFromPath(path) {
  const base = posixPath(path).split('/').pop() || 'style';
  return base
    .replace(/\.module\.css$/i, '-module')
    .replace(/\.css$/i, '')
    .replace(/\./g, '-');
}

/**
 * @param {string} s
 */
function slug(s) {
  return s.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'path';
}

/**
 * @param {object[]} navs
 */
function dedupeNav(navs) {
  const seen = new Set();
  const out = [];
  for (const n of navs) {
    const key = `${n.via}:${n.to_route_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

/**
 * @param {string} s
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {string} absRoot
 * @param {string} [relBase]
 */
async function walkSourceFiles(absRoot, relBase = '') {
  /** @type {string[]} */
  const out = [];
  async function walk(abs, rel) {
    let entries;
    try {
      entries = await readdir(abs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (SKIP_DIRS.has(ent.name)) continue;
      const childAbs = join(abs, ent.name);
      const childRel = posixPath(rel ? `${rel}/${ent.name}` : ent.name);
      if (ent.isDirectory()) {
        await walk(childAbs, childRel);
      } else if (relBase) {
        out.push(posixPath(`${relBase}/${childRel}`));
      } else {
        out.push(childRel);
      }
    }
  }
  const startAbs = absRoot || '.';
  await walk(startAbs, '');
  return out;
}

/**
 * @param {string} root
 */
async function findPackageJsonFiles(root) {
  const files = await walkSourceFiles(root);
  return files.filter((f) => /(^|\/)package\.json$/i.test(f));
}
