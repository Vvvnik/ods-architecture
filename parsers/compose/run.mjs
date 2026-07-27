#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import YAML from 'yaml';

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

function parseDependsOn(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((service) => ({ service: String(service) }));
  }
  if (typeof raw === 'object') {
    return Object.keys(raw).map((service) => ({
      service,
      condition: typeof raw[service] === 'object' ? raw[service]?.condition : undefined,
    }));
  }
  return [];
}

function parsePorts(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => String(entry));
  }
  return [String(raw)];
}

function parseEnvironment(raw) {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.map((entry) => {
      const text = String(entry);
      const idx = text.indexOf('=');
      if (idx === -1) {
        return { key: text, value: '' };
      }
      return { key: text.slice(0, idx), value: text.slice(idx + 1) };
    });
  }
  if (typeof raw === 'object') {
    return Object.entries(raw).map(([key, value]) => ({
      key,
      value: value == null ? '' : String(value),
    }));
  }
  return [];
}

function parseComposeFile(relativePath, content) {
  const doc = YAML.parse(content) ?? {};
  const services = [];
  const infrastructure = [];

  for (const [name, serviceDef] of Object.entries(doc.services ?? {})) {
    if (!serviceDef || typeof serviceDef !== 'object') {
      continue;
    }
    const def = serviceDef;
    services.push({
      name,
      dockerfile: def.build?.dockerfile ?? def.build?.context ?? undefined,
      ports: parsePorts(def.ports),
      profiles: Array.isArray(def.profiles) ? def.profiles.map(String) : undefined,
      depends_on: parseDependsOn(def.depends_on),
      environment: parseEnvironment(def.environment),
    });
  }

  for (const [name, infraDef] of Object.entries(doc.services ?? {})) {
    if (!infraDef || typeof infraDef !== 'object') {
      continue;
    }
    const image = String(infraDef.image ?? '');
    if (!image) {
      continue;
    }
    let infraKind = null;
    if (/postgres|mysql|mariadb|mssql|mongo/i.test(image)) {
      infraKind = 'database';
    } else if (/rabbit|kafka|redis/i.test(image)) {
      infraKind = 'broker';
    } else if (/minio|s3/i.test(image)) {
      infraKind = 'storage';
    }
    if (infraKind) {
      infrastructure.push({
        service_name: name,
        infra_kind: infraKind,
        image,
      });
    }
  }

  return {
    compose_file: posixPath(relativePath),
    services,
    infrastructure,
  };
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
const models = [];

for (const filePath of files) {
  const absPath = join(workingCopyRoot, filePath);
  try {
    const content = await readFile(absPath, 'utf8');
    models.push(parseComposeFile(posixPath(filePath), content));
  } catch (error) {
    console.error(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'compose',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: models.length === 1 ? models[0] : { files: models },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
