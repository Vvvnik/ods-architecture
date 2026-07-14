import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { FileInventoryService } from '../../src/services/file-inventory.service.js';

const LARGE_REPO_HOST = join(process.cwd(), '../docker/fixtures/repos/large-repo');

function countFiles(dir: string): number {
  let n = 0;
  for (const name of readdirSync(dir)) {
    if (name === '.git') continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) n += countFiles(p);
    else if (st.isFile()) n += 1;
  }
  return n;
}

describe('file-inventory-walk-count-large-repo (SC-002)', () => {
  it('one buildFileInventory walk on large-repo (≥1000 files)', async () => {
    if (!existsSync(LARGE_REPO_HOST)) {
      // skipIf ≠ PASS DoD — operator must fill quickstart table (contracts/scale-acceptance.md §A)
      console.warn(
        '[skipped] large-repo fixture missing; run docker/fixtures/repos/setup-fixtures.sh --demo',
      );
      return;
    }

    const fileCount = countFiles(LARGE_REPO_HOST);
    if (fileCount < 1000) {
      console.warn(`[skipped] large-repo has only ${fileCount} files; need ≥1000`);
      return;
    }

    const inventory = new FileInventoryService();
    inventory.resetWalkCount();
    const inv = await inventory.buildFileInventory('large', LARGE_REPO_HOST, [
      'node_modules',
      '.git',
    ]);
    expect(inventory.getWalkCount()).toBe(1);
    expect(inv.files.length).toBeGreaterThanOrEqual(1000);

    // reuse path (simulate detector+changeset) — no additional walk
    await inventory.getOrBuild('large', LARGE_REPO_HOST, ['node_modules', '.git']);
    expect(inventory.getWalkCount()).toBe(1);
  });
});

// silence unused in environments that tree-shake
void copyFileSync;
void mkdirSync;
void writeFileSync;
