/**
 * Fastify route extract (013): literal paths + same-file const prefix templates.
 * Supports optional TS generics: app.get<{...}>(path, handler).
 */

const HTTP_METHODS = 'get|post|put|patch|delete|options|head';

/**
 * @param {string} sourceText
 * @param {string} sourcePath repo-relative posix path
 */
export function extractFastifyRoutes(sourceText, sourcePath) {
  const posix = sourcePath.replace(/\\/g, '/');
  const constStrings = collectConstStringLiterals(sourceText);
  const routes = [];

  const startRe = new RegExp(
    `(?:^|[^.\\w])(?:app|server|fastify|instance|router)\\s*\\.\\s*(${HTTP_METHODS})\\b`,
    'gim',
  );

  let start = startRe.exec(sourceText);
  while (start) {
    const method = start[1].toUpperCase();
    let i = start.index + start[0].length;
    i = skipWs(sourceText, i);
    if (sourceText[i] === '<') {
      i = skipTypeArgs(sourceText, i);
      i = skipWs(sourceText, i);
    }
    if (sourceText[i] !== '(') {
      start = startRe.exec(sourceText);
      continue;
    }
    i += 1;
    i = skipWs(sourceText, i);
    const pathLit = readStringLiteral(sourceText, i);
    if (pathLit) {
      const resolved = resolvePathExpression(pathLit.value, pathLit.quote, constStrings);
      if (resolved.path) {
        const afterPath = skipWs(sourceText, pathLit.end);
        let handlerName;
        if (sourceText[afterPath] === ',') {
          const afterComma = skipWs(sourceText, afterPath + 1);
          const id = sourceText.slice(afterComma).match(/^([A-Za-z_$][\w$]*)/);
          if (id && id[1] !== 'async' && id[1] !== 'function') {
            handlerName = id[1];
          }
        }
        const route = {
          method,
          path: resolved.path,
          source_path: posix,
          path_complete: resolved.complete,
        };
        if (handlerName) {
          route.handler_name = handlerName;
        }
        const hint = serviceHintFromPath(posix);
        if (hint) {
          route.service_hint = hint;
        }
        routes.push(route);
      }
    }
    start = startRe.exec(sourceText);
  }

  // Chained calls without known receiver: .get( / .get<{...}>(
  const chainRe = new RegExp(`\\.\\s*(${HTTP_METHODS})\\b`, 'gim');
  let chain = chainRe.exec(sourceText);
  while (chain) {
    // skip if already covered by app.get above (same method index roughly)
    const method = chain[1].toUpperCase();
    let i = chain.index + chain[0].length;
    i = skipWs(sourceText, i);
    if (sourceText[i] === '<') {
      i = skipTypeArgs(sourceText, i);
      i = skipWs(sourceText, i);
    }
    if (sourceText[i] !== '(') {
      chain = chainRe.exec(sourceText);
      continue;
    }
    i += 1;
    i = skipWs(sourceText, i);
    const pathLit = readStringLiteral(sourceText, i);
    if (pathLit) {
      const resolved = resolvePathExpression(pathLit.value, pathLit.quote, constStrings);
      if (resolved.path) {
        const route = {
          method,
          path: resolved.path,
          source_path: posix,
          path_complete: resolved.complete,
        };
        const hint = serviceHintFromPath(posix);
        if (hint) {
          route.service_hint = hint;
        }
        routes.push(route);
      }
    }
    chain = chainRe.exec(sourceText);
  }

  return dedupeRoutes(routes);
}

function skipWs(text, index) {
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }
  return index;
}

/** Skip balanced <...> type arguments starting at '<'. */
function skipTypeArgs(text, index) {
  if (text[index] !== '<') {
    return index;
  }
  let depth = 0;
  for (let i = index; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '<') {
      depth += 1;
    } else if (ch === '>') {
      depth -= 1;
      if (depth === 0) {
        return i + 1;
      }
    } else if (ch === '"' || ch === "'" || ch === '`') {
      // skip string (unlikely in types but safe)
      i = readStringLiteral(text, i)?.end - 1 ?? i;
    }
  }
  return index;
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {{ value: string, quote: string, end: number } | null}
 */
function readStringLiteral(text, index) {
  const quote = text[index];
  if (quote !== "'" && quote !== '"' && quote !== '`') {
    return null;
  }
  let i = index + 1;
  let value = '';
  while (i < text.length) {
    const ch = text[i];
    if (ch === '\\') {
      value += ch + (text[i + 1] ?? '');
      i += 2;
      continue;
    }
    if (quote === '`' && ch === '$' && text[i + 1] === '{') {
      value += '${';
      i += 2;
      let depth = 1;
      while (i < text.length && depth > 0) {
        if (text[i] === '{') depth += 1;
        else if (text[i] === '}') depth -= 1;
        if (depth > 0) {
          value += text[i];
        } else {
          value += '}';
        }
        i += 1;
      }
      continue;
    }
    if (ch === quote) {
      return { value, quote, end: i + 1 };
    }
    value += ch;
    i += 1;
  }
  return null;
}

function collectConstStringLiterals(sourceText) {
  /** @type {Map<string, string>} */
  const map = new Map();
  const simple = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"])([^'"]*)\2/g;
  let m = simple.exec(sourceText);
  while (m) {
    map.set(m[1], m[3]);
    m = simple.exec(sourceText);
  }
  return map;
}

/**
 * @param {string} raw
 * @param {string} quote
 * @param {Map<string, string>} constStrings
 */
function resolvePathExpression(raw, quote, constStrings) {
  if (quote === '`' && raw.includes('${')) {
    const parts = [];
    let complete = true;
    const tokenRe = /\$\{([A-Za-z_$][\w$]*)\}|([^$]+)/g;
    let tm = tokenRe.exec(raw);
    while (tm) {
      if (tm[1]) {
        const value = constStrings.get(tm[1]);
        if (value == null) {
          complete = false;
          parts.push('');
        } else {
          parts.push(value);
        }
      } else if (tm[2]) {
        parts.push(tm[2]);
      }
      tm = tokenRe.exec(raw);
    }
    const path = normalizeHttpPath(parts.join(''));
    if (!path) {
      return { path: null, complete: false };
    }
    return { path, complete };
  }
  const path = normalizeHttpPath(raw);
  return path ? { path, complete: true } : { path: null, complete: false };
}

function normalizeHttpPath(path) {
  const trimmed = path.trim();
  if (!trimmed) {
    return null;
  }
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`.replace(/\/{2,}/g, '/');
  }
  return trimmed.replace(/\/{2,}/g, '/') || '/';
}

function serviceHintFromPath(relativePath) {
  const skip = new Set([
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
  ]);
  const parts = relativePath.split('/').filter(Boolean);
  const dirs = parts.slice(0, -1);
  for (const part of dirs) {
    const lower = part.toLowerCase();
    if (skip.has(lower) || part.includes('.')) {
      continue;
    }
    return lower;
  }
  return undefined;
}

function dedupeRoutes(routes) {
  const seen = new Set();
  const out = [];
  for (const route of routes) {
    const key = `${route.method}|${route.path}|${route.source_path}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(route);
  }
  return out;
}
