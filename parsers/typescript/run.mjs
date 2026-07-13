#!/usr/bin/env node

import { writeFile } from 'node:fs/promises';
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
  if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) {
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

function declarationName(node, sourceFile) {
  if (node.name && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
    return node.name.text;
  }
  return null;
}

function analyzeFile(absolutePath, relativePath, workingCopyRoot, program, compilerOptions) {
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

  function addSymbol(node, parentQualifiedName = '') {
    const kind = syntaxKindToNodeKind(node);
    if (!kind) {
      return null;
    }

    const name = declarationName(node, sourceFile);
    if (!name) {
      return null;
    }

    const qualifiedName = parentQualifiedName ? `${parentQualifiedName}.${name}` : name;
    const symbol = {
      name,
      kind,
      path: relativePath,
      qualified_name: qualifiedName,
      // Top-level в файле → parent = module; вложенные → parent = enclosing type
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
const absoluteFiles = files.map((filePath) => join(workingCopyRoot, filePath));

const compilerOptions = {
  allowJs: true,
  checkJs: false,
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  esModuleInterop: true,
  skipLibCheck: true,
  noEmit: true,
};

const program = ts.createProgram(absoluteFiles, compilerOptions);
const symbols = absoluteFiles.flatMap((absolutePath, index) =>
  analyzeFile(absolutePath, posixPath(files[index]), workingCopyRoot, program, compilerOptions),
);

const envelope = {
  parser_id: 'typescript',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: {
    symbols,
  },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
