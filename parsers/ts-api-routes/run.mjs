#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { extractFastifyRoutes } from './extract.mjs';
import { isTestOrSpecPath } from './path-filters.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const name = key.slice(2);
    args[name] = argv[i + 1];
    i += 1;
  }
  return args;
}

function posixPath(path) {
  return path.replace(/\\/g, '/');
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
const routes = [];

for (const filePath of files) {
  const rel = posixPath(filePath);
  if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(rel) || isTestOrSpecPath(rel)) {
    continue;
  }
  try {
    const content = await readFile(join(workingCopyRoot, rel), 'utf8');
    routes.push(...extractFastifyRoutes(content, rel));
  } catch (error) {
    console.error(`Failed to parse ${rel}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'ts-api-routes',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: { routes },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
