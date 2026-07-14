#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative } from 'node:path';

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

function normalizeRelativePath(workingCopyRoot, absolutePath) {
  return posixPath(relative(workingCopyRoot, absolutePath));
}

function detectProjectType(content) {
  if (/Microsoft\.NET\.Sdk\.Web/i.test(content)) {
    return 'web';
  }
  if (/Microsoft\.NET\.Sdk\.Worker/i.test(content)) {
    return 'worker';
  }
  if (/OutputType>Exe</i.test(content)) {
    return 'worker';
  }
  if (/Microsoft\.NET\.Sdk\.BlazorWebAssembly/i.test(content)) {
    return 'web';
  }
  if (/Microsoft\.NET\.Test\.Sdk/i.test(content)) {
    return 'test';
  }
  if (/Microsoft\.NET\.Sdk/i.test(content)) {
    return 'classlib';
  }
  return 'unknown';
}

function serviceFolderHint(projectPath) {
  const parts = posixPath(projectPath).split('/');
  const parent = parts.length >= 2 ? parts[parts.length - 2] : undefined;
  if (!parent || ['src', 'test', 'tests'].includes(parent.toLowerCase())) {
    return undefined;
  }
  return parent.toLowerCase();
}

function parseProjectReferences(content, projectPath) {
  const references = [];
  const regex = /<ProjectReference\s+Include="([^"]+)"/gi;
  let match = regex.exec(content);
  while (match) {
    const include = match[1].replace(/\\/g, '/');
    const absolute = posixPath(join(dirname(projectPath), include));
    references.push({
      path: absolute,
      name: basename(include),
    });
    match = regex.exec(content);
  }
  return references;
}

function parsePackageReferences(content) {
  const packages = [];
  const regex = /<PackageReference\s+Include="([^"]+)"/gi;
  let match = regex.exec(content);
  while (match) {
    packages.push(match[1]);
    match = regex.exec(content);
  }
  return packages;
}

function parseCsproj(relativePath, content) {
  const posix = posixPath(relativePath);
  const project = {
    path: posix,
    name: basename(posix),
    project_type: detectProjectType(content),
    references: parseProjectReferences(content, posix),
    package_references: parsePackageReferences(content),
  };
  const hint = serviceFolderHint(posix);
  if (hint) {
    project.service_folder_hint = hint;
  }
  return project;
}

function parseSln(relativePath) {
  const posix = posixPath(relativePath);
  return {
    path: posix,
    name: basename(posix).replace(/\.sln$/i, ''),
  };
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
const projects = [];
const solutions = [];
const seenProjects = new Set();

for (const filePath of files) {
  const absPath = join(workingCopyRoot, filePath);
  const relativePath = normalizeRelativePath(workingCopyRoot, absPath);
  const lower = relativePath.toLowerCase();

  try {
    if (lower.endsWith('.csproj')) {
      const content = await readFile(absPath, 'utf8');
      const project = parseCsproj(relativePath, content);
      if (!seenProjects.has(project.path)) {
        seenProjects.add(project.path);
        projects.push(project);
      }
      continue;
    }

    if (lower.endsWith('.sln')) {
      solutions.push(parseSln(relativePath));
    }
  } catch (error) {
    console.error(`Failed to parse ${relativePath}: ${error instanceof Error ? error.message : error}`);
  }
}

const envelope = {
  parser_id: 'dotnet-project',
  schema_version: '1',
  project_id: args['project-id'],
  analysis_run_id: args['analysis-run-id'],
  generated_at: new Date().toISOString(),
  files_analyzed: files.map(posixPath),
  model: {
    solutions: solutions.length > 0 ? solutions : undefined,
    projects,
  },
};

await writeFile(args.output, JSON.stringify(envelope, null, 2), 'utf8');
process.exit(0);
