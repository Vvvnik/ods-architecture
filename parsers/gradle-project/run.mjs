#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractGradleModules } from './extract.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((out, value, index, all) => {
  if (value.startsWith('--')) out.push([value.slice(2), all[index + 1]]);
  return out;
}, []));
for (const key of ['project-id', 'working-copy-root', 'analysis-run-id', 'output']) {
  if (!args[key]) throw new Error(`Missing required argument: --${key}`);
}
if (!args.files && !args['file-list']) {
  throw new Error('Missing required argument: --files or --file-list');
}
const rawFiles = args.files
  ? JSON.parse(args.files)
  : (await readFile(args['file-list'], 'utf8'))
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
const paths = rawFiles.map((path) => path.replace(/\\/g, '/'));
const files = [];
for (const path of paths.filter((value) => {
  const base = value.split('/').pop() ?? value;
  return base === 'build.gradle' || base === 'build.gradle.kts';
})) {
  try {
    files.push({ path, content: await readFile(join(args['working-copy-root'], path), 'utf8') });
  } catch (error) {
    console.error(`Failed to parse ${path}: ${error.message}`);
  }
}
await writeFile(args.output, JSON.stringify({
  parser_id: 'gradle-project',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: paths,
  model: { modules: extractGradleModules(files) },
}, null, 2));
