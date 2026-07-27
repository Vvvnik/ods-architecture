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

function detectEngine(key, value) {
  const haystack = `${key} ${value}`.toLowerCase();
  if (/postgres|npgsql/.test(haystack)) {
    return 'postgres';
  }
  if (/mssql|sql server|sqlserver/.test(haystack)) {
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
  if (/redis/.test(haystack)) {
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

function detectBindingType(key, value) {
  const keyLower = key.toLowerCase();
  const valueLower = String(value).toLowerCase();

  if (/connectionstring|connection_string|datasource|database/.test(keyLower)) {
    return 'database';
  }
  if (/^jdbc:|^mongodb:|^postgres:|^mysql:|^sqlserver:/.test(valueLower)) {
    return 'database';
  }
  if (/server=.*database=/i.test(value)) {
    return 'database';
  }
  if (/host=.*port=.*(postgres|mysql|mssql)/i.test(value)) {
    return 'database';
  }
  if (/rabbit|kafka|masstransit|bootstrapservers|amqp:\/\//i.test(`${key} ${value}`)) {
    return 'broker';
  }
  if (/redis:\/\//i.test(valueLower)) {
    return 'cache';
  }
  if (/^https?:\/\//i.test(valueLower) && /url|endpoint|base/i.test(keyLower)) {
    return 'http_base_url';
  }
  if (/minio|s3:\/\//i.test(valueLower)) {
    return 'storage';
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

function bindingsFromEntries(entries) {
  const bindings = [];
  for (const [key, value] of Object.entries(entries)) {
    const bindingType = detectBindingType(key, value);
    if (!bindingType) {
      continue;
    }
    const binding = {
      key,
      binding_type: bindingType,
    };
    const engine = detectEngine(key, value);
    if (engine) {
      binding.engine = engine;
    }
    const targetHint = extractTargetHint(value);
    if (targetHint) {
      binding.target_hint = targetHint;
    }
    binding.raw_redacted = redactSecrets(value);
    bindings.push(binding);
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
