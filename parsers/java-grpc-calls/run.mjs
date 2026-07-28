#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractJavaGrpcCalls } from './extract.mjs';
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, arr) => {
  if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1]]);
  return acc;
}, []));
const files = args.files ? JSON.parse(args.files) : (await readFile(args['file-list'], 'utf8')).split('\n').map(s=>s.trim()).filter(Boolean);
const calls = [];
for (const p of files) {
  const rel = p.replace(/\\/g, '/');
  if (!rel.endsWith('.java') || /(?:^|\/)(?:test|tests)\//i.test(rel)) continue;
  const text = await readFile(join(args['working-copy-root'], rel), 'utf8');
  calls.push(...extractJavaGrpcCalls(text, rel));
}
await writeFile(args.output, JSON.stringify({ parser_id:'java-grpc-calls', schema_version:'1', project_id:args['project-id'], analysis_run_id:args['analysis-run-id'], generated_at:new Date().toISOString(), files_analyzed:files, model:{calls}}, null, 2));
