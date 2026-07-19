#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseSpringConfig } from './extract.mjs';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
for (const key of ['project-id', 'working-copy-root', 'analysis-run-id', 'files', 'output']) {
  if (!args[key]) throw new Error(`Missing required argument: --${key}`);
}
const paths = JSON.parse(args.files).map((path) => path.replace(/\\/g, '/'));
const configs = [];
for (const path of paths.filter((value) => /(?:^|\/)application(?:-[^/]*)?\.(?:ya?ml|properties)$/i.test(value))) {
  try { configs.push(parseSpringConfig(path, await readFile(join(args['working-copy-root'], path), 'utf8'))); }
  catch (error) { console.error(`Failed to parse ${path}: ${error.message}`); }
}
await writeFile(args.output, JSON.stringify({
  parser_id: 'spring-config', schema_version: '1',
  project_id: args['project-id'], analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(), files_analyzed: paths, model: { configs },
}, null, 2));
