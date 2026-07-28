#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractGrpcProto } from './extract.mjs';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
for (const key of ['project-id', 'working-copy-root', 'analysis-run-id', 'output']) {
  if (!args[key]) throw new Error(`Missing required argument: --${key}`);
}
if (!args.files && !args['file-list']) {
  throw new Error('Missing required argument: --files or --file-list');
}
const files = args.files
  ? JSON.parse(args.files)
  : (await readFile(args['file-list'], 'utf8')).split('\n').map((s) => s.trim()).filter(Boolean);
const services = [];
for (const filePath of files) {
  const rel = String(filePath).replace(/\\/g, '/');
  if (!rel.endsWith('.proto')) continue;
  const content = await readFile(join(args['working-copy-root'], rel), 'utf8');
  services.push(...extractGrpcProto(content, rel));
}
await writeFile(args.output, JSON.stringify({
  parser_id: 'grpc-proto', schema_version: '1',
  project_id: args['project-id'], analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(), files_analyzed: files, model: { services },
}, null, 2));
