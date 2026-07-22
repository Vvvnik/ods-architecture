#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { serviceHintFromPath as javaServiceHintFromPath } from '../_shared/java-spring/extract.mjs';

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

function csharpServiceHintFromPath(relativePath) {
  const parts = posixPath(relativePath).split('/');
  if (parts.length >= 2) {
    return parts[parts.length - 2].toLowerCase();
  }
  return undefined;
}

function parseCsharpKafkaHandlers(relativePath, content) {
  const handlers = [];
  const posix = posixPath(relativePath);

  const classMatch = content.match(/class\s+(\w+)/);
  const className = classMatch?.[1];

  const consumerRegex = /IConsumer<([\w.]+)>/g;
  let match = consumerRegex.exec(content);
  while (match) {
    handlers.push({
      path: posix,
      class_name: className,
      role: 'consumer',
      message_type: match[1].split('.').pop() ?? match[1],
    });
    match = consumerRegex.exec(content);
  }

  const topicRegex = /Topic\("([^"]+)"\)/g;
  let topicMatch = topicRegex.exec(content);
  while (topicMatch) {
    handlers.push({
      path: posix,
      class_name: className,
      role: 'consumer',
      topic: topicMatch[1],
      message_type: className ?? 'KafkaMessage',
    });
    topicMatch = topicRegex.exec(content);
  }

  return handlers;
}

function firstQuoted(args) {
  return args.match(/["']([^"']+)["']/)?.[1] ?? null;
}

function parseJavaKafkaHandlers(relativePath, content) {
  const handlers = [];
  const publishSites = [];
  const posix = posixPath(relativePath);
  const classMatch = content.match(/class\s+(\w+)/);
  const className = classMatch?.[1];

  const listenerRe =
    /@KafkaListener\s*\(([\s\S]*?)\)\s*(?:public|protected|private)?\s*[\w.<>,\s\[\]]+\s+(\w+)\s*\(\s*(?:final\s+)?([\w.]+)/g;
  let match = listenerRe.exec(content);
  while (match) {
    const args = match[1];
    const topic =
      args.match(/topics?\s*=\s*(?:\{\s*)?["']([^"']+)["']/)?.[1] ??
      firstQuoted(args);
    handlers.push({
      path: posix,
      class_name: className,
      role: 'consumer',
      topic: topic ?? undefined,
      message_type: match[3].split('.').pop() ?? match[3],
    });
    match = listenerRe.exec(content);
  }

  const sendRe = /kafkaTemplate\s*\.\s*send\s*\(\s*["']([^"']+)["']/gi;
  let sendMatch = sendRe.exec(content);
  while (sendMatch) {
    publishSites.push({
      path: posix,
      topic: sendMatch[1],
      message_type: className ?? 'KafkaMessage',
    });
    sendMatch = sendRe.exec(content);
  }

  return { handlers, publishSites };
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
const publishSites = [];
const serviceHints = new Set();

for (const filePath of files) {
  const absPath = join(workingCopyRoot, filePath);
  const posix = posixPath(filePath);
  try {
    if (posix.endsWith('.cs')) {
      const content = await readFile(absPath, 'utf8');
      handlers.push(...parseCsharpKafkaHandlers(posix, content));
      const hint = csharpServiceHintFromPath(posix);
      if (hint) serviceHints.add(hint);
    } else if (posix.endsWith('.java')) {
      const content = await readFile(absPath, 'utf8');
      const parsed = parseJavaKafkaHandlers(posix, content);
      handlers.push(...parsed.handlers);
      publishSites.push(...parsed.publishSites);
      const hint = javaServiceHintFromPath(posix);
      if (hint) serviceHints.add(hint);
    }
  } catch (error) {
    console.error(`Failed to parse ${posix}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'bus-kafka',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: {
    service_hint: serviceHints.size === 1 ? [...serviceHints][0] : undefined,
    handlers,
    publish_sites: publishSites.length > 0 ? publishSites : undefined,
  },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
