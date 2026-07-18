/**
 * Extract HTTP calls via shared /api/v1 API client (014 DoD).
 * Recognizes API_BASE='/api/v1' + apiFetch(path) / fetch(`${API_BASE}${path}`).
 */

const API_BASE_RE =
  /(?:const|let|var)\s+API_BASE\s*=\s*(['"])(\/api\/v1)\1/;

const IMPORT_API_FETCH_RE =
  /import\s*\{[^}]*\bapiFetch\b[^}]*\}\s*from\s*['"][^'"]+['"]/;

/** apiFetch(... path ...) with optional generic, multiline args, trailing comma */
const API_FETCH_CALL_RE =
  /\bapiFetch\s*(?:<[^>]*>)?\s*\(\s*(['"`])([\s\S]*?)\1\s*(?:,\s*(\{[\s\S]*?\}))?\s*,?\s*\)/g;

const FETCH_API_BASE_RE =
  /\bfetch\s*\(\s*(?:`\$\{API_BASE\}([^`]+)`|(['"])(\/api\/v1[^'"]*)\2)\s*(?:,\s*(\{[\s\S]*?\}))?\s*\)/g;

function posixPath(path) {
  return path.replace(/\\/g, '/');
}

function serviceHintFromPath(sourcePath) {
  const parts = posixPath(sourcePath).split('/').filter(Boolean);
  for (const part of parts.slice(0, -1)) {
    const lower = part.toLowerCase();
    if (
      ['src', 'lib', 'app', 'apps', 'packages', 'api', 'dist', 'node_modules'].includes(
        lower,
      ) ||
      part.includes('.')
    ) {
      continue;
    }
    return lower;
  }
  return null;
}

function methodFromInit(initText) {
  if (!initText) {
    return 'GET';
  }
  const match = /method\s*:\s*['"]([A-Za-z]+)['"]/.exec(initText);
  return match ? match[1].toUpperCase() : 'GET';
}

function joinApiPath(relativePath) {
  const rel = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  if (rel.startsWith('/api/v1')) {
    return rel;
  }
  return `/api/v1${rel}`;
}

function isExternalUrl(path) {
  return /^https?:\/\//i.test(path) || path.startsWith('//');
}

/**
 * Turn `/projects/${id}/sync` into `/projects/:id/sync` for stable matching.
 * Rejects strings that are only dynamic or contain expressions we cannot map.
 */
function normalizeCallPath(rawPath) {
  let path = rawPath.trim();
  // Drop query builders appended in template literals
  path = path.replace(/\$\{buildQuery\([\s\S]*?\)\}/g, '');
  const q = path.indexOf('?');
  if (q >= 0) {
    path = path.slice(0, q);
  }
  if (isExternalUrl(path) || path.includes('${API_BASE}')) {
    return null;
  }
  path = path.replace(/\$\{([^}]+)\}/g, (_m, expr) => {
    const name = String(expr).trim().replace(/^.*\./, '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      return ':param';
    }
    return `:${name}`;
  });
  if (path.includes('${') || path.includes('`')) {
    return null;
  }
  if (path.includes('+') || path.includes("'") || path.includes('"')) {
    return null;
  }
  return path;
}

/**
 * @param {string} sourceText
 * @param {string} sourcePath
 * @returns {Array<{ method: string, path: string, source_path: string, service_hint: string|null, callee_service_hint: string|null }>}
 */
export function extractHttpCalls(sourceText, sourcePath) {
  const rel = posixPath(sourcePath);
  const hasApiBase = API_BASE_RE.test(sourceText);
  const importsApiFetch = IMPORT_API_FETCH_RE.test(sourceText);
  const usesSharedClient = hasApiBase || importsApiFetch || /\bapiFetch\b/.test(sourceText);

  const calls = [];
  const seen = new Set();

  function pushCall(method, rawPath) {
    const normalized = normalizeCallPath(rawPath);
    if (!normalized) {
      return;
    }
    const fullPath = joinApiPath(normalized);
    if (!fullPath.startsWith('/api/v1')) {
      return;
    }
    const key = `${method}|${fullPath}|${rel}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    calls.push({
      method,
      path: fullPath,
      source_path: rel,
      service_hint: serviceHintFromPath(rel),
      callee_service_hint: 'backend',
    });
  }

  if (usesSharedClient) {
    API_FETCH_CALL_RE.lastIndex = 0;
    let match;
    while ((match = API_FETCH_CALL_RE.exec(sourceText)) !== null) {
      pushCall(methodFromInit(match[3]), match[2]);
    }
  }

  if (hasApiBase || usesSharedClient) {
    FETCH_API_BASE_RE.lastIndex = 0;
    let match;
    while ((match = FETCH_API_BASE_RE.exec(sourceText)) !== null) {
      const path = match[1] ?? match[3];
      if (!path) {
        continue;
      }
      // Skip client implementation: fetch(`${API_BASE}${path}`)
      if (/^\$\{[A-Za-z_][A-Za-z0-9_]*\}$/.test(path.trim())) {
        continue;
      }
      const full = path.startsWith('/api/v1') ? path : joinApiPath(path);
      pushCall(methodFromInit(match[4]), full);
    }
  }

  return calls;
}
