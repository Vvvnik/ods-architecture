#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import YAML from 'yaml';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

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

function serviceHintFromPath(relativePath) {
  const parts = posixPath(relativePath).split('/');
  for (const part of parts) {
    if (/\.(api|worker|service)$/i.test(part) || /api$/i.test(part)) {
      return part;
    }
  }
  const fileStem = basename(relativePath).replace(/\.(ya?ml)$/i, '');
  if (fileStem && !/^openapi$/i.test(fileStem)) {
    return fileStem.replace(/_kafka_fake$/i, '');
  }
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return undefined;
}

function topicHintFromFileName(relativePath) {
  const fileName = basename(relativePath);
  const match = fileName.match(/(.+)_kafka_fake\.ya?ml$/i);
  return match ? match[1] : undefined;
}

function extractMessageSchemas(doc, relativePath) {
  const schemas = [];
  const components = doc.components?.schemas ?? {};
  const topicHint = topicHintFromFileName(relativePath);

  for (const [name, schemaDef] of Object.entries(components)) {
    if (!schemaDef || typeof schemaDef !== 'object') {
      continue;
    }
    const entry = { name };
    const topic =
      schemaDef['x-kafka-topic'] ??
      schemaDef['x-topic'] ??
      (topicHint && /message|event/i.test(name) ? topicHint : undefined);
    if (topic) {
      entry.topic_hint = String(topic);
    }
    schemas.push(entry);
  }

  if (topicHint && schemas.length === 0) {
    schemas.push({ name: topicHint, topic_hint: topicHint });
  }

  return schemas.length > 0 ? schemas : undefined;
}

function parseOpenApiFile(relativePath, content) {
  const doc = YAML.parse(content) ?? {};
  const endpoints = [];

  for (const [pathTemplate, pathItem] of Object.entries(doc.paths ?? {})) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }
    for (const [method, operation] of Object.entries(pathItem)) {
      const upperMethod = method.toUpperCase();
      if (!HTTP_METHODS.has(upperMethod)) {
        continue;
      }
      const endpoint = {
        method: upperMethod,
        path: pathTemplate,
      };
      if (operation && typeof operation === 'object') {
        if (operation.operationId) {
          endpoint.operation_id = String(operation.operationId);
        }
        if (operation.summary) {
          endpoint.summary = String(operation.summary);
        }
        if (Array.isArray(operation.tags)) {
          endpoint.tags = operation.tags.map(String);
        }
      }
      endpoints.push(endpoint);
    }
  }

  const spec = {
    path: posixPath(relativePath),
    endpoints,
  };

  if (doc.info?.title) {
    spec.title = String(doc.info.title);
  }

  const serviceHint = serviceHintFromPath(relativePath);
  if (serviceHint) {
    spec.service_hint = serviceHint;
  }

  const messageSchemas = extractMessageSchemas(doc, relativePath);
  if (messageSchemas) {
    spec.message_schemas = messageSchemas;
  }

  return spec;
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
const specs = [];

for (const filePath of files) {
  const absPath = join(workingCopyRoot, filePath);
  try {
    const content = await readFile(absPath, 'utf8');
    specs.push(parseOpenApiFile(posixPath(filePath), content));
  } catch (error) {
    console.error(`Failed to parse ${filePath}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'openapi',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: { specs },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
