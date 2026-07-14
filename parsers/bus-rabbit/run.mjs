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

function serviceHintFromPath(relativePath) {
  const parts = posixPath(relativePath).split('/');
  if (parts.length >= 2) {
    const parent = parts[parts.length - 2];
    if (!['src', 'handlers', 'listeners', 'consumers'].includes(parent.toLowerCase())) {
      return parent.toLowerCase();
    }
  }
  return undefined;
}

function parseHandlers(relativePath, content) {
  const handlers = [];
  const posix = posixPath(relativePath);
  if (!posix.endsWith('.cs')) {
    return handlers;
  }

  const classMatch = content.match(/class\s+(\w+)/);
  const listenerClass = classMatch?.[1];

  const consumerRegex = /IConsumer<([\w.]+)>/g;
  let consumerMatch = consumerRegex.exec(content);
  while (consumerMatch) {
    const messageType = consumerMatch[1].split('.').pop() ?? consumerMatch[1];
    handlers.push({
      path: posix,
      listener_class: listenerClass,
      handler_method: 'Consume',
      role: 'consumer',
      message_type: messageType,
    });
    consumerMatch = consumerRegex.exec(content);
  }

  const methodRegex =
    /(?:public|private|protected)\s+(?:async\s+)?(?:Task(?:<[^>]+>)?|void)\s+(\w+)\s*\(\s*(?:[\w.]+\.)?(\w+)\s+\w+/g;
  let methodMatch = methodRegex.exec(content);
  while (methodMatch) {
    const messageType = methodMatch[2];
    if (!/Message$|Event$|Command$/i.test(messageType) && !content.includes('RabbitMQ')) {
      methodMatch = methodRegex.exec(content);
      continue;
    }
    handlers.push({
      path: posix,
      listener_class: listenerClass,
      handler_method: methodMatch[1],
      role: 'consumer',
      message_type: messageType,
    });
    methodMatch = methodRegex.exec(content);
  }

  const queueRegex = /\[RabbitListener\("([^"]+)"\)\]/g;
  let queueMatch = queueRegex.exec(content);
  while (queueMatch) {
    handlers.push({
      path: posix,
      listener_class: listenerClass,
      role: 'consumer',
      message_type: listenerClass ?? 'UnknownMessage',
      queue_hint: queueMatch[1],
    });
    queueMatch = queueRegex.exec(content);
  }

  return handlers;
}

const args = parseArgs(process.argv.slice(2));
const required = ['project-id', 'working-copy-root', 'analysis-run-id', 'files', 'output'];
for (const key of required) {
  if (!args[key]) {
    console.error(`Missing required argument: --${key}`);
    process.exit(1);
  }
}

const workingCopyRoot = args['working-copy-root'];
const files = JSON.parse(args.files);
const handlers = [];
const serviceHints = new Set();

for (const filePath of files) {
  const absPath = join(workingCopyRoot, filePath);
  const posix = posixPath(filePath);
  try {
    if (posix.endsWith('.cs')) {
      const content = await readFile(absPath, 'utf8');
      const parsed = parseHandlers(posix, content);
      handlers.push(...parsed);
      const hint = serviceHintFromPath(posix);
      if (hint) {
        serviceHints.add(hint);
      }
    }
  } catch (error) {
    console.error(`Failed to parse ${posix}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'bus-rabbit',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: {
    service_hint: serviceHints.size === 1 ? [...serviceHints][0] : undefined,
    handlers,
  },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
