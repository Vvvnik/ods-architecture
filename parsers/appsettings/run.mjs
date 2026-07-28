#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const name = key.slice(2);
    const value = argv[i + 1];
    args[name] = value;
    i += 1;
  }
  return args;
}

function posixPath(path) {
  return path.replace(/\\/g, '/');
}

function flattenObject(obj, prefix = '') {
  const result = {};
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return result;
  }
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}__${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (value != null && value !== '') {
      result[fullKey] = String(value);
    }
  }
  return result;
}

function parseEnvFile(content) {
  const entries = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const idx = withoutExport.indexOf('=');
    if (idx === -1) {
      continue;
    }
    const key = withoutExport.slice(0, idx).trim();
    let value = withoutExport.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    entries[key] = value;
  }
  return entries;
}

function redactSecrets(value) {
  return String(value)
    .replace(/(Password|Pwd)=([^;]+)/gi, '$1=***')
    .replace(/(User ID|Username|Uid)=([^;]+)/gi, '$1=***')
    .replace(/(apikey|api_key|token|secret)=([^;&\s]+)/gi, '$1=***');
}

const PROVIDER_TOKEN_RE =
  /^(mssql|sqlserver|sql server|postgres|npgsql|postgresql|mysql|mariadb|sqlite)$/i;

function normalizeProviderEngine(value) {
  const v = String(value).trim().toLowerCase();
  if (v === 'mssql' || v === 'sqlserver' || v === 'sql server') {
    return 'mssql';
  }
  if (v === 'postgres' || v === 'npgsql' || v === 'postgresql') {
    return 'postgres';
  }
  if (v === 'mysql' || v === 'mariadb') {
    return 'mysql';
  }
  if (v === 'sqlite') {
    return 'sqlite';
  }
  return undefined;
}

function detectEngine(key, value) {
  const haystack = `${key} ${value}`.toLowerCase();
  if (/postgres|npgsql/.test(haystack)) {
    return 'postgres';
  }
  if (/\bport\s*=\s*5432\b/.test(haystack) && /\bhost\s*=/.test(haystack)) {
    return 'postgres';
  }
  if (/mssql|sql server|sqlserver/.test(haystack)) {
    return 'mssql';
  }
  if (
    (/initial\s*catalog|data\s*source\s*=/.test(haystack) ||
      (/\bserver\s*=/.test(haystack) && /\bdatabase\s*=/.test(haystack))) &&
    !/\bhost\s*=/.test(haystack) &&
    !/postgres|npgsql/.test(haystack)
  ) {
    return 'mssql';
  }
  if (/mysql|mariadb/.test(haystack)) {
    return 'mysql';
  }
  if (/mongo/.test(haystack)) {
    return 'mongodb';
  }
  if (/couch/.test(haystack)) {
    return 'couchdb';
  }
  if (/kafka/.test(haystack)) {
    return 'kafka';
  }
  if (/rabbit|amqp/.test(haystack)) {
    return 'rabbitmq';
  }
  if (
    /redis/.test(haystack) ||
    (/defaultdatabase/i.test(String(value)) && /:\d+\s*,/.test(String(value)))
  ) {
    return 'redis';
  }
  if (/minio|s3/.test(haystack)) {
    return 'minio';
  }
  if (/elastic|opensearch/.test(haystack)) {
    return 'elasticsearch';
  }
  return undefined;
}

function isConnectionStringsKey(key) {
  return /^connectionstrings(__|$)/i.test(key);
}

function connectionStringsLeaf(key) {
  const match = key.match(/^ConnectionStrings__(.+)$/i);
  return match ? match[1] : undefined;
}

function isStackExchangeRedis(value) {
  const v = String(value);
  return /defaultdatabase/i.test(v) || (/^[^,/]+:\d+\s*,/.test(v) && /,/.test(v));
}

function isRabbitConnectionValue(value) {
  const v = String(value).toLowerCase();
  return (
    v.includes('amqp://') ||
    (v.includes('host=') && (v.includes('virtualhost') || /:\s*5672\b/.test(v) || v.includes('rabbit')))
  );
}

function looksLikeDatabaseDsn(value) {
  const v = String(value);
  const lower = v.toLowerCase();
  if (/^jdbc:|^mongodb:|^postgres:|^mysql:|^sqlserver:/.test(lower)) {
    return true;
  }
  if (/server\s*=.+database\s*=/i.test(v)) {
    return true;
  }
  if (/data\s*source\s*=/i.test(v) || /initial\s*catalog\s*=/i.test(v)) {
    return true;
  }
  if (/host\s*=/i.test(v) && /database\s*=/i.test(v)) {
    return true;
  }
  if (/host\s*=/i.test(v) && /port\s*=/i.test(v)) {
    return true;
  }
  if (/:\/\//.test(v) && !/^https?:\/\//i.test(v) && !/^amqp:/i.test(v) && !/^redis:/i.test(v)) {
    return true;
  }
  return false;
}

function classifyLeafRole(leafName) {
  const l = String(leafName).toLowerCase();
  if (/timeout|interval|ttl|retry|prefetch|pool|flush|batch|size|count/.test(l)) {
    return 'scalar';
  }
  if (/user|password|pwd|secret|token|login|accesskey|secretkey/.test(l)) {
    return 'credential';
  }
  if (l === 'port' || /port$/.test(l)) {
    return 'port';
  }
  if (/host|server|address|endpoint|url|uri|bootstrap/.test(l)) {
    return 'endpoint';
  }
  if (/index|bucket|vhost|virtual|database|catalog|region|prefix/.test(l)) {
    return 'resource';
  }
  return 'other';
}

function sectionInfraKind(sectionName) {
  const s = String(sectionName).toLowerCase();
  if (s === 'connectionstrings') {
    return null;
  }
  if (/redis|cache/.test(s)) {
    return 'cache';
  }
  if (/elastic|opensearch/.test(s) || /search$/.test(s)) {
    return 'search';
  }
  if (/minio|s3|filestorage|objectstorage|blobstorage/.test(s)) {
    return 'storage';
  }
  if (/rabbit|kafka|masstransit|amqp|\bbus\b/.test(s) || /bus$/.test(s)) {
    return 'broker';
  }
  if (/mongo/.test(s)) {
    return 'database';
  }
  return null;
}

function detectBindingType(key, value) {
  const keyLower = key.toLowerCase();
  const valueLower = String(value).toLowerCase();
  const leaf = key.includes('__') ? key.slice(key.lastIndexOf('__') + 2) : key;
  const role = classifyLeafRole(leaf);

  if (role === 'scalar' || role === 'credential' || role === 'port') {
    return null;
  }

  if (PROVIDER_TOKEN_RE.test(String(value).trim()) && /^provider$/i.test(leaf)) {
    return 'other';
  }

  if (/rabbit|kafka|masstransit|bootstrapservers|amqp:\/\//i.test(`${key} ${value}`) || isRabbitConnectionValue(value)) {
    return 'broker';
  }
  if (/redis/i.test(`${key} ${value}`) || /^redis:\/\//i.test(valueLower) || isStackExchangeRedis(value)) {
    return 'cache';
  }
  if (/elastic|opensearch/i.test(`${key} ${value}`)) {
    return 'search';
  }
  if (/minio|s3:\/\//i.test(`${key} ${value}`) || /s3:\/\//i.test(valueLower)) {
    return 'storage';
  }
  if (/^https?:\/\//i.test(valueLower) && /url|endpoint|base|address|host/i.test(keyLower)) {
    return 'http_base_url';
  }
  if (isConnectionStringsKey(key) && looksLikeDatabaseDsn(value)) {
    return 'database';
  }
  if (/^jdbc:|^mongodb:|^postgres:|^mysql:|^sqlserver:/.test(valueLower)) {
    return 'database';
  }
  if (/server=.*database=/i.test(value) || /host=.*database=/i.test(value)) {
    return 'database';
  }
  if (/data\s*source\s*=/i.test(value) || /initial\s*catalog\s*=/i.test(value)) {
    return 'database';
  }
  if (/connectionstring|connection_string|datasource/i.test(keyLower) && looksLikeDatabaseDsn(value)) {
    return 'database';
  }
  return null;
}

function extractTargetHint(value) {
  const text = String(value);
  const urlMatch = text.match(/^(?:amqp|redis|mongodb|postgres|mysql|https?):\/\/([^/?#]+)/i);
  if (urlMatch) {
    return urlMatch[1];
  }
  const hostPort = text.match(/(?:Host|Server|BootstrapServers)=([^;]+)/i);
  if (hostPort) {
    return hostPort[1].trim();
  }
  if (/^[^,/:=\s]+:\d+/.test(text)) {
    return text.split(',')[0].trim();
  }
  if (/^[\w.-]+$/.test(text) || /^\d+\.\d+\.\d+\.\d+$/.test(text)) {
    return text.trim();
  }
  return undefined;
}

function environmentFromPath(relativePath) {
  const fileName = basename(relativePath);
  const match = fileName.match(/^appsettings\.(.+)\.json$/i);
  return match ? match[1] : undefined;
}

function serviceHintFromPath(relativePath) {
  const parts = posixPath(relativePath).split('/');
  if (parts.length >= 2) {
    const parent = parts[parts.length - 2];
    if (!['src', 'config', 'configs', 'settings'].includes(parent.toLowerCase())) {
      return parent;
    }
  }
  const stem = basename(relativePath).replace(/\.(json|env)$/i, '');
  if (stem && !/^appsettings/i.test(stem) && stem !== '.env' && stem !== 'example') {
    return stem;
  }
  return undefined;
}

function makeBinding(key, bindingType, value, extras = {}) {
  const binding = {
    key,
    binding_type: bindingType,
  };
  const engine =
    extras.engine !== undefined ? extras.engine : detectEngine(key, value);
  if (engine) {
    binding.engine = engine;
  }
  const targetHint =
    extras.target_hint !== undefined ? extras.target_hint : extractTargetHint(value);
  if (targetHint) {
    binding.target_hint = targetHint;
  }
  if (extras.raw_redacted != null) {
    binding.raw_redacted = extras.raw_redacted;
  } else {
    binding.raw_redacted = redactSecrets(value);
  }
  return binding;
}

function groupBySection(entries) {
  /** @type {Map<string, Array<{ leaf: string, fullKey: string, value: string }>>} */
  const sections = new Map();
  /** @type {Array<{ fullKey: string, value: string }>} */
  const topLevel = [];

  for (const [fullKey, value] of Object.entries(entries)) {
    const idx = fullKey.indexOf('__');
    if (idx === -1) {
      topLevel.push({ fullKey, value: String(value) });
      continue;
    }
    const section = fullKey.slice(0, idx);
    const leaf = fullKey.slice(idx + 2);
    if (!sections.has(section)) {
      sections.set(section, []);
    }
    sections.get(section).push({ leaf, fullKey, value: String(value) });
  }
  return { sections, topLevel };
}

function coalesceSettingsSection(sectionName, leaves, bindingType) {
  let endpoint;
  let port;
  const resources = [];
  const scalars = [];

  for (const item of leaves) {
    const role = classifyLeafRole(item.leaf);
    if (role === 'endpoint') {
      endpoint = item.value;
    } else if (role === 'port') {
      port = item.value;
    } else if (role === 'resource') {
      resources.push(`${item.leaf}=${item.value}`);
    } else if (role === 'scalar') {
      scalars.push(`${item.leaf}=${item.value}`);
    }
  }

  let targetHint = endpoint ? extractTargetHint(endpoint) ?? endpoint.trim() : undefined;
  if (targetHint && port && !/:\d+/.test(targetHint) && !/^https?:\/\//i.test(targetHint)) {
    targetHint = `${targetHint}:${port}`;
  }

  const summaryParts = [];
  if (targetHint) {
    summaryParts.push(targetHint);
  }
  if (resources.length > 0) {
    summaryParts.push(resources.join(';'));
  }
  if (scalars.length > 0) {
    summaryParts.push(scalars.join(';'));
  }
  const raw = summaryParts.length > 0 ? summaryParts.join('|') : sectionName;

  const engine =
    detectEngine(sectionName, `${targetHint ?? ''} ${resources.join(' ')}`) ??
    (bindingType === 'broker'
      ? /kafka/i.test(sectionName)
        ? 'kafka'
        : 'rabbitmq'
      : bindingType === 'cache'
        ? 'redis'
        : bindingType === 'search'
          ? 'elasticsearch'
          : bindingType === 'storage'
            ? 'minio'
            : undefined);

  return makeBinding(sectionName, bindingType, raw, {
    engine,
    target_hint: targetHint,
    raw_redacted: redactSecrets(raw),
  });
}

function bindingsFromConnectionStrings(leaves) {
  const bindings = [];
  let providerEngine;

  for (const item of leaves) {
    const leaf = item.leaf;
    const value = item.value;
    const fullKey = item.fullKey;
    const leafBase = leaf.includes('__') ? leaf.slice(leaf.lastIndexOf('__') + 2) : leaf;

    if (/^provider$/i.test(leafBase) && PROVIDER_TOKEN_RE.test(value.trim())) {
      const engine = normalizeProviderEngine(value);
      providerEngine = engine ?? providerEngine;
      bindings.push(
        makeBinding(fullKey, 'other', value, {
          engine,
          target_hint: undefined,
        }),
      );
      continue;
    }

    if (PROVIDER_TOKEN_RE.test(value.trim()) && !looksLikeDatabaseDsn(value)) {
      const engine = normalizeProviderEngine(value);
      providerEngine = engine ?? providerEngine;
      bindings.push(makeBinding(fullKey, 'other', value, { engine }));
      continue;
    }

    const hay = `${leaf} ${value}`;
    if (
      /rabbit|kafka|masstransit|bootstrapservers|amqp:\/\//i.test(hay) ||
      isRabbitConnectionValue(value)
    ) {
      bindings.push(makeBinding(fullKey, 'broker', value));
      continue;
    }
    if (/redis/i.test(hay) || /^redis:\/\//i.test(value) || isStackExchangeRedis(value)) {
      bindings.push(makeBinding(fullKey, 'cache', value));
      continue;
    }
    if (/minio|s3:\/\//i.test(hay)) {
      bindings.push(makeBinding(fullKey, 'storage', value));
      continue;
    }
    if (/elastic|opensearch/i.test(hay)) {
      bindings.push(makeBinding(fullKey, 'search', value));
      continue;
    }
    if (/^https?:\/\//i.test(value) && !looksLikeDatabaseDsn(value)) {
      bindings.push(makeBinding(fullKey, 'http_base_url', value));
      continue;
    }
    if (looksLikeDatabaseDsn(value)) {
      bindings.push(makeBinding(fullKey, 'database', value));
      continue;
    }
  }

  if (providerEngine) {
    for (const binding of bindings) {
      if (binding.binding_type === 'database' && !binding.engine) {
        binding.engine = providerEngine;
      }
    }
  }

  return bindings;
}

function bindingsFromEntries(entries) {
  const { sections, topLevel } = groupBySection(entries);
  const bindings = [];
  const handledSections = new Set();

  const csLeaves = sections.get('ConnectionStrings') ?? sections.get('connectionstrings');
  if (csLeaves) {
    const csKey = [...sections.keys()].find((k) => k.toLowerCase() === 'connectionstrings');
    bindings.push(...bindingsFromConnectionStrings(csLeaves));
    if (csKey) {
      handledSections.add(csKey);
    }
  }

  for (const [sectionName, leaves] of sections.entries()) {
    if (handledSections.has(sectionName)) {
      continue;
    }
    const kind = sectionInfraKind(sectionName);
    if (!kind) {
      continue;
    }
    bindings.push(coalesceSettingsSection(sectionName, leaves, kind));
    handledSections.add(sectionName);
  }

  for (const [sectionName, leaves] of sections.entries()) {
    if (handledSections.has(sectionName)) {
      continue;
    }
    for (const item of leaves) {
      const bindingType = detectBindingType(item.fullKey, item.value);
      if (!bindingType) {
        continue;
      }
      bindings.push(makeBinding(item.fullKey, bindingType, item.value));
    }
  }

  for (const item of topLevel) {
    const bindingType = detectBindingType(item.fullKey, item.value);
    if (!bindingType) {
      continue;
    }
    bindings.push(makeBinding(item.fullKey, bindingType, item.value));
  }

  return bindings;
}

function parseAppsettingsFile(relativePath, content) {
  const posix = posixPath(relativePath);
  const lower = posix.toLowerCase();
  let entries = {};

  if (lower.endsWith('.json')) {
    const doc = JSON.parse(content);
    entries = flattenObject(doc);
  } else if (lower.endsWith('.env') || lower.endsWith('example.env')) {
    entries = parseEnvFile(content);
  } else {
    return null;
  }

  const source = {
    path: posix,
    bindings: bindingsFromEntries(entries),
  };
  const environment = environmentFromPath(posix);
  if (environment) {
    source.environment = environment;
  }
  const serviceHint = serviceHintFromPath(posix);
  if (serviceHint) {
    source.service_hint = serviceHint;
  }
  return source;
}

const args = parseArgs(process.argv.slice(2));
const required = ['project-id', 'working-copy-root', 'analysis-run-id', 'output'];
for (const key of required) {
  if (!args[key]) {
    console.error(`Missing required argument: --${key}`);
    process.exit(1);
  }
}

const workingCopyRoot = args['working-copy-root'];
const files =
  args.files != null
    ? JSON.parse(args.files)
    : (await readFile(args['file-list'], 'utf8'))
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
const sources = [];

for (const filePath of files) {
  const absPath = join(workingCopyRoot, filePath);
  try {
    const content = await readFile(absPath, 'utf8');
    const source = parseAppsettingsFile(posixPath(filePath), content);
    if (source) {
      sources.push(source);
    }
  } catch (error) {
    console.error(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'appsettings',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: { sources },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
