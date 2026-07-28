#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import ts from 'typescript';

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) {
      continue;
    }
    const name = key.slice(2);
    if (name === 'ods-worker') {
      args[name] = 'true';
      continue;
    }
    const value = argv[i + 1];
    args[name] = value;
    i += 1;
  }
  return args;
}

function toLocation(node, sourceFile) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  return {
    start_line: start.line + 1,
    start_col: start.character,
    end_line: end.line + 1,
    end_col: end.character,
  };
}

function posixPath(path) {
  return path.replace(/\\/g, '/');
}

function syntaxKindToNodeKind(node) {
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
    return 'function';
  }
  if (ts.isMethodDeclaration(node)) {
    return 'method';
  }
  if (ts.isClassDeclaration(node)) {
    return 'class';
  }
  if (ts.isInterfaceDeclaration(node)) {
    return 'interface';
  }
  if (ts.isEnumDeclaration(node)) {
    return 'enum';
  }
  if (ts.isPropertyDeclaration(node)) {
    return 'property';
  }
  if (ts.isModuleDeclaration(node)) {
    return 'namespace';
  }
  if (ts.isVariableDeclaration(node)) {
    return 'variable';
  }
  return null;
}

function resolveImportPath(importerRelativePath, moduleSpecifier, workingCopyRoot, compilerOptions) {
  const importerAbsolute = join(workingCopyRoot, importerRelativePath);
  const resolved = ts.resolveModuleName(
    moduleSpecifier,
    importerAbsolute,
    compilerOptions,
    ts.sys,
  );

  const fileName = resolved.resolvedModule?.resolvedFileName;
  if (!fileName || !fileName.startsWith(workingCopyRoot)) {
    return null;
  }

  return posixPath(relative(workingCopyRoot, fileName));
}

function importRefFromSpecifier(importerPath, moduleSpecifier, workingCopyRoot, compilerOptions) {
  const targetPath = resolveImportPath(importerPath, moduleSpecifier, workingCopyRoot, compilerOptions);
  if (!targetPath) {
    return null;
  }

  const importName = basename(targetPath).replace(/\.(tsx?|jsx?|mjs|cjs)$/i, '');
  return {
    type: 'imports',
    name: importName,
    kind: 'module',
    path: targetPath,
    qualified_name: targetPath,
  };
}

function collectImportRefs(node, importerPath, workingCopyRoot, compilerOptions) {
  const refs = [];

  if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
    const ref = importRefFromSpecifier(
      importerPath,
      node.moduleSpecifier.text,
      workingCopyRoot,
      compilerOptions,
    );
    if (ref) {
      refs.push(ref);
    }
    return refs;
  }

  if (
    ts.isExportDeclaration(node) &&
    node.moduleSpecifier &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    const ref = importRefFromSpecifier(
      importerPath,
      node.moduleSpecifier.text,
      workingCopyRoot,
      compilerOptions,
    );
    if (ref) {
      refs.push({ ...ref, type: 'exports' });
    }
  }

  return refs;
}

function declarationName(node) {
  if (node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return null;
}

function analyzeFileSymbols(absolutePath, relativePath, workingCopyRoot, program, compilerOptions, checker, qnByDeclSymbol) {
  const sourceFile = program.getSourceFile(absolutePath);
  if (!sourceFile) {
    return [];
  }

  const symbols = [];
  const moduleSymbol = {
    name: basename(relativePath),
    kind: 'module',
    path: relativePath,
    qualified_name: relativePath,
    location: toLocation(sourceFile, sourceFile),
    refs: [],
  };
  symbols.push(moduleSymbol);

  function registerQn(node, qualifiedName) {
    if (node.name) {
      const sym = checker.getSymbolAtLocation(node.name);
      if (sym) {
        qnByDeclSymbol.set(sym, qualifiedName);
      }
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const sym = checker.getSymbolAtLocation(node.name);
      if (sym) {
        qnByDeclSymbol.set(sym, qualifiedName);
      }
    }
  }

  function addSymbol(node, parentQualifiedName = '') {
    const kind = syntaxKindToNodeKind(node);
    if (!kind) {
      return null;
    }

    const name = declarationName(node);
    if (!name) {
      return null;
    }

    const qualifiedName = parentQualifiedName ? `${parentQualifiedName}.${name}` : name;
    const symbol = {
      name,
      kind,
      path: relativePath,
      qualified_name: qualifiedName,
      parent_qualified_name: parentQualifiedName || moduleSymbol.qualified_name,
      location: toLocation(node, sourceFile),
      refs: [],
    };

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      const signature = node.getText(sourceFile).split('\n')[0]?.slice(0, 200);
      if (signature) {
        symbol.signature = signature;
      }
    }

    symbols.push(symbol);
    registerQn(node, qualifiedName);
    return qualifiedName;
  }

  function visit(node, parentQualifiedName = '') {
    moduleSymbol.refs.push(...collectImportRefs(node, relativePath, workingCopyRoot, compilerOptions));

    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      const qualifiedName = addSymbol(node, parentQualifiedName);
      if (qualifiedName) {
        for (const member of node.members ?? []) {
          visit(member, qualifiedName);
        }
      }
      return;
    }

    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        visit(declaration, parentQualifiedName);
      }
      return;
    }

    const qualifiedName = addSymbol(node, parentQualifiedName);
    if (qualifiedName) {
      return;
    }

    ts.forEachChild(node, (child) => visit(child, parentQualifiedName));
  }

  visit(sourceFile);
  return symbols;
}

function resolveCalleeQn(callExpr, checker, qnByDeclSymbol) {
  const expr = callExpr.expression;
  let target = expr;
  if (ts.isPropertyAccessExpression(expr)) {
    target = expr.name;
  }

  let symbol = checker.getSymbolAtLocation(target);
  if (!symbol) {
    return null;
  }
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol);
  }

  if (qnByDeclSymbol.has(symbol)) {
    return qnByDeclSymbol.get(symbol);
  }

  const signature = checker.getResolvedSignature(callExpr);
  const declaration = signature?.declaration;
  if (declaration?.name) {
    const declSym = checker.getSymbolAtLocation(declaration.name);
    if (declSym && qnByDeclSymbol.has(declSym)) {
      return qnByDeclSymbol.get(declSym);
    }
  }

  return null;
}

function enclosingCallerQn(node, checker, qnByDeclSymbol) {
  let current = node.parent;
  while (current) {
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isFunctionExpression(current) ||
      ts.isArrowFunction(current)
    ) {
      if (current.name) {
        const sym = checker.getSymbolAtLocation(current.name);
        if (sym && qnByDeclSymbol.has(sym)) {
          return qnByDeclSymbol.get(sym);
        }
      }
      if (
        ts.isVariableDeclaration(current.parent) &&
        ts.isIdentifier(current.parent.name)
      ) {
        const sym = checker.getSymbolAtLocation(current.parent.name);
        if (sym && qnByDeclSymbol.has(sym)) {
          return qnByDeclSymbol.get(sym);
        }
      }
    }
    current = current.parent;
  }
  return null;
}

async function buildEnvelope(projectId, analysisRunId, workingCopyRoot, files) {
  const absoluteFiles = files.map((filePath) => join(workingCopyRoot, filePath));

  const compilerOptions = {
    allowJs: true,
    checkJs: false,
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    esModuleInterop: true,
    skipLibCheck: true,
    noEmit: true,
  };

  const program = ts.createProgram(absoluteFiles, compilerOptions);
  const checker = program.getTypeChecker();
  const qnByDeclSymbol = new Map();

  const allSymbols = [];
  for (let index = 0; index < absoluteFiles.length; index += 1) {
    allSymbols.push(
      ...analyzeFileSymbols(
        absoluteFiles[index],
        posixPath(files[index]),
        workingCopyRoot,
        program,
        compilerOptions,
        checker,
        qnByDeclSymbol,
      ),
    );
  }

  const allUsages = [];
  for (let index = 0; index < absoluteFiles.length; index += 1) {
    const sourceFile = program.getSourceFile(absoluteFiles[index]);
    if (!sourceFile) {
      continue;
    }
    const relativePath = posixPath(files[index]);

    function walk(node) {
      if (ts.isCallExpression(node)) {
        const from = enclosingCallerQn(node, checker, qnByDeclSymbol);
        const to = resolveCalleeQn(node, checker, qnByDeclSymbol);
        if (from && to && from !== to) {
          allUsages.push({
            from,
            to,
            type: 'calls',
            path: relativePath,
            location: toLocation(node, sourceFile),
          });
        }
      }
      ts.forEachChild(node, walk);
    }

    walk(sourceFile);
  }

  return {
    parser_id: 'typescript',
    schema_version: '2',
    project_id: projectId,
    analysis_run_id: analysisRunId,
    generated_at: new Date().toISOString(),
    files_analyzed: files.map(posixPath),
    model: {
      symbols: allSymbols,
      ...(allUsages.length > 0 ? { usages: allUsages } : {}),
    },
  };
}

async function resolveFilesFromArgs(args) {
  if (args.files != null) {
    return JSON.parse(args.files);
  }
  if (args['file-list']) {
    return (await readFile(args['file-list'], 'utf8'))
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  throw new Error('Missing required argument: --files or --file-list');
}

async function runWorker(args) {
  const workingCopyRoot = args['working-copy-root'];
  const projectId = args['project-id'];
  const analysisRunId = args['analysis-run-id'];
  process.stdout.write(`${JSON.stringify({ op: 'ready' })}\n`);

  const readline = await import('node:readline');
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    let msg;
    try {
      msg = JSON.parse(trimmed);
    } catch {
      process.stdout.write(
        `${JSON.stringify({ op: 'chunk_result', chunk_index: -1, status: 'error', message: 'invalid JSON' })}\n`,
      );
      continue;
    }
    if (msg.op === 'shutdown') {
      process.stdout.write(`${JSON.stringify({ op: 'bye' })}\n`);
      break;
    }
    if (msg.op !== 'chunk') {
      process.stdout.write(
        `${JSON.stringify({
          op: 'chunk_result',
          chunk_index: msg.chunk_index ?? -1,
          status: 'error',
          message: `unknown op: ${msg.op}`,
        })}\n`,
      );
      continue;
    }
    try {
      const files = (await readFile(msg.file_list, 'utf8'))
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const envelope = await buildEnvelope(projectId, analysisRunId, workingCopyRoot, files);
      await writeFile(msg.output, JSON.stringify(envelope, null, 2), 'utf8');
      process.stdout.write(
        `${JSON.stringify({
          op: 'chunk_result',
          chunk_index: msg.chunk_index,
          status: 'ok',
          output: msg.output,
        })}\n`,
      );
    } catch (error) {
      process.stdout.write(
        `${JSON.stringify({
          op: 'chunk_result',
          chunk_index: msg.chunk_index,
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })}\n`,
      );
    }
  }
  process.exit(0);
}

const args = parseArgs(process.argv.slice(2));

if (args['ods-worker'] === 'true') {
  for (const key of ['project-id', 'working-copy-root', 'analysis-run-id']) {
    if (!args[key]) {
      console.error(`Missing required argument: --${key}`);
      process.exit(1);
    }
  }
  await runWorker(args);
} else {
  const required = ['project-id', 'working-copy-root', 'analysis-run-id', 'output'];
  for (const key of required) {
    if (!args[key]) {
      console.error(`Missing required argument: --${key}`);
      process.exit(1);
    }
  }

  const workingCopyRoot = args['working-copy-root'];
  const files = await resolveFilesFromArgs(args);
  const envelope = await buildEnvelope(
    args['project-id'],
    args['analysis-run-id'],
    workingCopyRoot,
    files,
  );
  await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
  process.exit(0);
}
