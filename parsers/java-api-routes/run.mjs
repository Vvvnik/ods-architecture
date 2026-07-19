#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractSpringRoutes } from './extract.mjs';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
for (const key of ['project-id', 'working-copy-root', 'analysis-run-id', 'files', 'output']) {
  if (!args[key]) throw new Error(`Missing required argument: --${key}`);
}
const paths = JSON.parse(args.files).map((path) => path.replace(/\\/g, '/'));
const routes = [];
const routeFiles = paths.filter(
  (value) =>
    (value.endsWith('.java') || /\.(ya?ml|properties)$/i.test(value)) &&
    !/(?:^|\/)(?:test|tests)\//i.test(value),
);
for (const path of routeFiles) {
  try { routes.push(...extractSpringRoutes(await readFile(join(args['working-copy-root'], path), 'utf8'), path)); }
  catch (error) { console.error(`Failed to parse ${path}: ${error.message}`); }
}
await writeFile(args.output, JSON.stringify({
  parser_id: 'java-api-routes', schema_version: '1',
  project_id: args['project-id'], analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(), files_analyzed: paths, model: { routes },
}, null, 2));
