import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function createTempGitRepo(files: Record<string, string> = {}): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'ods-repo-'));
  await execFileAsync('git', ['init'], { cwd: root });
  await execFileAsync('git', ['config', 'user.email', 'test@ods.local'], { cwd: root });
  await execFileAsync('git', ['config', 'user.name', 'ODS Test'], { cwd: root });

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = join(root, relativePath);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content, 'utf8');
  }

  if (Object.keys(files).length > 0) {
    await execFileAsync('git', ['add', '.'], { cwd: root });
    await execFileAsync('git', ['commit', '-m', 'init'], { cwd: root });
  }

  return root;
}

export async function createManyFiles(
  root: string,
  directory: string,
  count: number,
  prefix = 'file',
): Promise<void> {
  const dir = join(root, directory);
  await mkdir(dir, { recursive: true });

  for (let i = 0; i < count; i += 1) {
    const name = `${prefix}-${String(i).padStart(4, '0')}.txt`;
    await writeFile(join(dir, name), `content ${i}\n`, 'utf8');
  }
}

export async function addBrokenSymlink(root: string, linkPath: string): Promise<void> {
  const absoluteLink = join(root, linkPath);
  await mkdir(dirname(absoluteLink), { recursive: true });
  await symlink('/nonexistent-ods-target', absoluteLink);
}

export async function isElasticsearchAvailable(
  url = process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
): Promise<boolean> {
  try {
    const response = await fetch(`${url}/_cluster/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export function uniqueSourceValue(basePath: string): string {
  return `${basePath}#${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
