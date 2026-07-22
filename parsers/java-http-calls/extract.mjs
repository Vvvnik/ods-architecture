import {
  MAPPING_METHODS, annotationBlocks, firstAnnotationLiteral,
  normalizeHttpPath, requestMappingMethod, serviceHintFromPath,
} from '../_shared/java-spring/extract.mjs';

export function extractJavaHttpCalls(sourceText, sourcePath) {
  return [
    ...extractFeign(sourceText, sourcePath),
    ...extractUriClient(sourceText, sourcePath, 'webclient', /\bWebClient\b|webClient(?:Builder)?\s*\./),
    ...extractUriClient(sourceText, sourcePath, 'restclient', /\bRestClient\b|restClient\s*\./),
    ...extractRestTemplate(sourceText, sourcePath),
    ...extractHttpUrlConnection(sourceText, sourcePath),
  ];
}

function extractFeign(sourceText, sourcePath) {
  const feign = sourceText.match(/@FeignClient\s*\(([\s\S]*?)\)/);
  if (!feign) return [];
  const callee = feign[1].match(/(?:name|value)\s*=\s*["']([^"']+)["']|["']([^"']+)["']/)?.slice(1).find(Boolean);
  const basePath = feign[1].match(/path\s*=\s*["']([^"']+)["']/)?.[1] ?? '';
  return annotationBlocks(sourceText)
    .map((block) => {
      const method = MAPPING_METHODS[block.name] ?? requestMappingMethod(block.args);
      if (!method) return null;
      return {
        method, path: normalizeHttpPath(basePath, firstAnnotationLiteral(block.args)),
        source_path: sourcePath.replace(/\\/g, '/'), client_kind: 'feign',
        service_hint: serviceHintFromPath(sourcePath), callee_service_hint: callee ?? null,
      };
    })
    .filter(Boolean);
}

/** Field/local `String name = "…"` bindings used in `.uri(name + "…")`. */
export function collectStringConstants(sourceText) {
  const map = new Map();
  const re = /(?:(?:private|protected|public|static|final)\s+)*String\s+(\w+)\s*=\s*["']([^"']+)["']/g;
  let match;
  while ((match = re.exec(sourceText))) {
    map.set(match[1], match[2]);
  }
  return map;
}

/** `getInstances("customers-service")` inside named method → service id. */
export function resolveDiscoveryServiceName(sourceText, methodName) {
  if (!methodName || !/^\w+$/.test(methodName)) return null;
  // Prefer method *definitions* (`name(...) {`), not call sites (`name() +`).
  const re = new RegExp(`\\b${methodName}\\s*\\([^)]*\\)\\s*\\{`, 'g');
  let match;
  while ((match = re.exec(sourceText))) {
    const brace = match.index + match[0].length - 1;
    let depth = 0;
    let end = brace;
    for (let i = brace; i < sourceText.length; i += 1) {
      const ch = sourceText[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    const body = sourceText.slice(brace, end + 1);
    const service = body.match(/getInstances\s*\(\s*["']([^"']+)["']\s*\)/)?.[1];
    if (service) return service;
  }
  return null;
}

/**
 * Resolve `.uri` first-arg to { rawUrlOrPath, callee }.
 * Supports literals, const + "lit", method() that wraps DiscoveryClient,
 * and `"/owners/" + ownerId + "/pets"` → `/owners/{ownerId}/pets`.
 */
export function resolveUriExpression(expr, constants = new Map(), sourceText = '') {
  const trimmed = expr.trim();
  if (!trimmed) return null;
  const parts = splitPlusParts(trimmed);
  if (parts.length === 0) return null;

  let resolved = '';
  let callee = null;
  for (const part of parts) {
    const lit = part.match(/^["']([^"']*)["']$/);
    if (lit) {
      resolved += lit[1];
      continue;
    }
    const methodCall = part.match(/^(\w+)\s*\(\s*\)$/);
    if (methodCall) {
      const service = resolveDiscoveryServiceName(sourceText, methodCall[1]);
      if (!service) return null;
      callee = service;
      continue;
    }
    if (/^\w+$/.test(part) && constants.has(part)) {
      resolved += constants.get(part);
      continue;
    }
    if (/^\w+$/.test(part)) {
      resolved += `{${part}}`;
      continue;
    }
    return null;
  }
  if (!resolved && !callee) return null;
  return { raw: resolved || '/', callee };
}

function splitPlusParts(trimmed) {
  const parts = [];
  let buf = '';
  let inQuote = null;
  let paren = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    const ch = trimmed[i];
    if (inQuote) {
      buf += ch;
      if (ch === inQuote && trimmed[i - 1] !== '\\') inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') {
      paren += 1;
      buf += ch;
      continue;
    }
    if (ch === ')') {
      paren -= 1;
      buf += ch;
      continue;
    }
    if (ch === '+' && paren === 0) {
      parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

function parseHttpTarget(raw, calleeHint = null) {
  let path = raw;
  let callee = calleeHint;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw.replace(/\{[^}]+\}/g, 'x'));
      callee = callee ?? url.hostname;
      const pathMatch = raw.match(/^https?:\/\/[^/?#]+([^?#]*)/i);
      path = pathMatch?.[1] || '/';
    } catch {
      const m = raw.match(/^https?:\/\/([^/?#]+)([^?#]*)/i);
      if (m) {
        callee = callee ?? m[1];
        path = m[2] || '/';
      }
    }
  } else {
    path = raw.split(/[?#]/, 1)[0];
  }
  path = decodeURIComponent(String(path).split(/[?#]/, 1)[0]).replace(/\/+$/, '') || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  return { path: normalizeHttpPath(path), callee };
}

function extractUriClient(sourceText, sourcePath, clientKind, gate) {
  if (!gate.test(sourceText)) return [];
  const constants = collectStringConstants(sourceText);
  const calls = [];
  const methodRe = /\.(get|post|put|patch|delete|head|options)\s*\(\s*\)\s*\.\s*uri\s*\(/gi;
  let match;
  while ((match = methodRe.exec(sourceText))) {
    const method = match[1].toUpperCase();
    const argStart = methodRe.lastIndex;
    const firstArg = readBalancedArg(sourceText, argStart);
    if (firstArg == null) continue;
    let raw;
    let calleeFromExpr = null;
    const plainLit = firstArg.match(/^["']([^"']+)["']$/);
    if (plainLit) {
      raw = plainLit[1];
    } else {
      const resolved = resolveUriExpression(firstArg, constants, sourceText);
      if (!resolved) continue;
      raw = resolved.raw;
      calleeFromExpr = resolved.callee;
    }
    const { path, callee } = parseHttpTarget(raw, calleeFromExpr);
    calls.push({
      method,
      path,
      source_path: sourcePath.replace(/\\/g, '/'),
      client_kind: clientKind,
      service_hint: serviceHintFromPath(sourcePath),
      callee_service_hint: callee,
    });
  }
  return calls;
}

const REST_TEMPLATE_METHOD = {
  getForObject: 'GET',
  getForEntity: 'GET',
  postForObject: 'POST',
  postForEntity: 'POST',
  postForLocation: 'POST',
  put: 'PUT',
  delete: 'DELETE',
  patchForObject: 'PATCH',
};

/**
 * RestTemplate call-sites with a statically resolvable first URL argument.
 * Unresolved expressions are skipped (019 follow-up; no invented endpoints).
 */
export function extractRestTemplate(sourceText, sourcePath) {
  if (!/\bRestTemplate\b/.test(sourceText)) return [];
  const constants = collectStringConstants(sourceText);
  const calls = [];
  const re =
    /\.(getForObject|getForEntity|postForObject|postForEntity|postForLocation|put|delete|patchForObject|exchange)\s*\(/g;
  let match;
  while ((match = re.exec(sourceText))) {
    const api = match[1];
    const argStart = re.lastIndex;
    const firstArg = readBalancedArg(sourceText, argStart);
    if (firstArg == null) continue;

    let method = REST_TEMPLATE_METHOD[api] ?? null;
    if (api === 'exchange') {
      const afterUrl = sourceText.slice(argStart + firstArg.length);
      const comma = afterUrl.match(/^\s*,/);
      if (!comma) continue;
      const methodArg = readBalancedArg(sourceText, argStart + firstArg.length + comma[0].length);
      const httpMethod = methodArg?.match(/HttpMethod\.(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/i)?.[1];
      if (!httpMethod) continue;
      method = httpMethod.toUpperCase();
    }
    if (!method) continue;

    const resolved = resolveUrlArg(firstArg, constants, sourceText);
    if (!resolved) continue;
    const { path, callee } = parseHttpTarget(resolved.raw, resolved.callee);
    calls.push({
      method,
      path,
      source_path: sourcePath.replace(/\\/g, '/'),
      client_kind: 'resttemplate',
      service_hint: serviceHintFromPath(sourcePath),
      callee_service_hint: callee,
    });
  }
  return calls;
}

/** Minimal raw HTTP: `new URL("…").openConnection()` → GET unless setRequestMethod nearby. */
export function extractHttpUrlConnection(sourceText, sourcePath) {
  if (!/\bHttpURLConnection\b|\.openConnection\s*\(/.test(sourceText)) return [];
  const constants = collectStringConstants(sourceText);
  const calls = [];
  const re = /new\s+URL\s*\(\s*([^)]+?)\s*\)\s*\.\s*openConnection\s*\(/g;
  let match;
  while ((match = re.exec(sourceText))) {
    const resolved = resolveUrlArg(match[1], constants, sourceText);
    if (!resolved) continue;
    const window = sourceText.slice(match.index, match.index + 400);
    const method = window.match(/setRequestMethod\s*\(\s*["'](GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)["']\s*\)/i)?.[1]
      ?.toUpperCase() ?? 'GET';
    const { path, callee } = parseHttpTarget(resolved.raw, resolved.callee);
    calls.push({
      method,
      path,
      source_path: sourcePath.replace(/\\/g, '/'),
      client_kind: 'httpurlconnection',
      service_hint: serviceHintFromPath(sourcePath),
      callee_service_hint: callee,
    });
  }
  return calls;
}

function resolveUrlArg(firstArg, constants, sourceText) {
  const plainLit = firstArg.match(/^["']([^"']+)["']$/);
  if (plainLit) return { raw: plainLit[1], callee: null };
  return resolveUriExpression(firstArg, constants, sourceText);
}

/** First `.uri(` argument, respecting nested () and quotes; stops at top-level `,` or `)`. */
function readBalancedArg(sourceText, start) {
  let i = start;
  while (i < sourceText.length && /\s/.test(sourceText[i])) i += 1;
  let depth = 0;
  let inQuote = null;
  let buf = '';
  for (; i < sourceText.length; i += 1) {
    const ch = sourceText[i];
    if (inQuote) {
      buf += ch;
      if (ch === inQuote && sourceText[i - 1] !== '\\') inQuote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = ch;
      buf += ch;
      continue;
    }
    if (ch === '(') {
      depth += 1;
      buf += ch;
      continue;
    }
    if (ch === ')') {
      if (depth === 0) return buf.trim();
      depth -= 1;
      buf += ch;
      continue;
    }
    if (ch === ',' && depth === 0) return buf.trim();
    buf += ch;
  }
  return null;
}
