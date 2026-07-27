#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';

const STD_HEADER_NAMESPACE = new Map([
  ['iostream', 'std'],
  ['string', 'std'],
  ['vector', 'std'],
  ['memory', 'std'],
  ['algorithm', 'std'],
]);

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

function toLocation(startLine, startCol, endLine, endCol) {
  return {
    start_line: startLine,
    start_col: startCol,
    end_line: endLine,
    end_col: endCol,
  };
}

function resolveIncludePath(importerPath, includeTarget, workingCopyRoot) {
  if (!includeTarget.startsWith('.')) {
    return null;
  }

  const importerDir = dirname(importerPath);
  return posixPath(relative(workingCopyRoot, join(workingCopyRoot, importerDir, includeTarget)));
}

function collectIncludeRefs(source, relativePath, workingCopyRoot) {
  const refs = [];
  const includePattern = /^\s*#\s*include\s*([<"])([^>"]+)[>"]/gm;

  for (const match of source.matchAll(includePattern)) {
    const delimiter = match[1];
    const target = match[2];
    const line = source.slice(0, match.index).split('\n').length;

    if (delimiter === '<') {
      const header = basename(target);
      refs.push({
        type: 'imports',
        name: header,
        kind: 'namespace',
        qualified_name: STD_HEADER_NAMESPACE.get(header) ?? header,
        location: toLocation(line, 0, line, 0),
      });
      continue;
    }

    const resolved = resolveIncludePath(relativePath, target, workingCopyRoot);
    refs.push({
      type: 'imports',
      name: basename(target),
      kind: 'module',
      path: resolved ?? target,
      qualified_name: resolved ?? target,
      location: toLocation(line, 0, line, 0),
    });
  }

  return refs;
}

function collectFunctions(source, relativePath) {
  const symbols = [];
  const functionPattern =
    /(^|\n)\s*(?:template\s*<[^>]*>\s*)?(?:[\w:*&<>,\s]+?)\s+(\w+)\s*\([^;{}]*\)\s*(?:const\b[^;{]*)?\s*\{/g;

  for (const match of source.matchAll(functionPattern)) {
    const name = match[2];
    if (name === 'if' || name === 'for' || name === 'while' || name === 'switch') {
      continue;
    }

    const line = source.slice(0, match.index).split('\n').length;
    const snippet = match[0].trim().split('\n')[0] ?? '';
    const signatureMatch = snippet.match(/\(([^)]*)\)/);
    const signature = signatureMatch ? `(${signatureMatch[1]})` : '()';

    symbols.push({
      name,
      kind: 'function',
      path: relativePath,
      qualified_name: name,
      signature,
      location: toLocation(line, 0, line + 3, 0),
      refs: [],
    });
  }

  return symbols;
}

function collectClasses(source, relativePath) {
  const symbols = [];
  const classPattern = /(?:class|struct)\s+(\w+)/g;

  for (const match of source.matchAll(classPattern)) {
    const line = source.slice(0, match.index).split('\n').length;
    symbols.push({
      name: match[1],
      kind: 'class',
      path: relativePath,
      qualified_name: match[1],
      location: toLocation(line, 0, line + 1, 0),
      refs: [],
    });
  }

  return symbols;
}

function analyzeFile(source, relativePath, workingCopyRoot) {
  const lines = source.split('\n');
  const includeRefs = collectIncludeRefs(source, relativePath, workingCopyRoot);

  const moduleSymbol = {
    name: basename(relativePath),
    kind: 'module',
    path: relativePath,
    qualified_name: relativePath,
    location: toLocation(1, 0, lines.length, 0),
    refs: includeRefs,
  };

  const functions = collectFunctions(source, relativePath);
  const mainFunction = functions.find((symbol) => symbol.name === 'main');
  if (mainFunction && includeRefs.length > 0) {
    mainFunction.refs = includeRefs.map((ref) => ({ ...ref }));
  }

  return [moduleSymbol, ...collectClasses(source, relativePath), ...functions];
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
const symbols = [];

for (const filePath of files) {
  const relativePath = posixPath(filePath);
  const absolutePath = join(workingCopyRoot, relativePath);
  try {
    const source = await readFile(absolutePath, 'utf8');
    symbols.push(...analyzeFile(source, relativePath, workingCopyRoot));
  } catch {
    continue;
  }
}

const envelope = {
  parser_id: 'cpp',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: { symbols },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
