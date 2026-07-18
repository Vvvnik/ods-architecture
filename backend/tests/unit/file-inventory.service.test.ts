import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, beforeEach } from 'vitest';

import { FileInventoryService } from '../../src/services/file-inventory.service.js';
import { ChangeSetService } from '../../src/services/change-set.service.js';
import { LanguageDetectorService } from '../../src/services/language-detector.service.js';

describe('FileInventoryService', () => {
  let root: string;
  let inventory: FileInventoryService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ods-inv-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'node_modules', 'pkg'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;');
    await writeFile(join(root, 'node_modules', 'pkg', 'x.js'), 'module.exports = 1;');
    inventory = new FileInventoryService();
    inventory.resetWalkCount();
  });

  it('buildFileInventory respects denylist and sorts paths', async () => {
    const result = await inventory.buildFileInventory('p1', root, ['node_modules']);
    expect(result.files.map((f) => f.path)).toEqual(['src/a.ts']);
    expect(result.source).toBe('sync_walk');
    expect(inventory.getWalkCount()).toBe(1);
  });

  it('denies tests path segments (014 hygiene)', async () => {
    await mkdir(join(root, 'tests', 'unit'), { recursive: true });
    await writeFile(join(root, 'tests', 'unit', 'fake.ts'), 'app.get("/x", () => {});');
    const result = await inventory.buildFileInventory('p1', root, [
      'node_modules',
      'tests',
      '__tests__',
      '__mocks__',
    ]);
    expect(result.files.map((f) => f.path)).toEqual(['src/a.ts']);
  });

  it('publishFromSyncWalk counts as one walk; getOrBuild reuses without walk', async () => {
    inventory.publishFromSyncWalk('p1', [
      { path: 'src/a.ts', mtime_ms: 1, size: 1 },
    ]);
    expect(inventory.getWalkCount()).toBe(1);
    const reused = await inventory.getOrBuild('p1', root, ['node_modules']);
    expect(reused.source).toBe('reuse');
    expect(inventory.getWalkCount()).toBe(1);
  });
});

describe('file-inventory-reuse', () => {
  it('detector + changeset use same inventory without extra walk', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ods-reuse-'));
    await mkdir(join(root, 'src'), { recursive: true });
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;');

    const inventory = new FileInventoryService();
    inventory.resetWalkCount();
    const snap = inventory.publishFromSyncWalk('proj', [
      { path: 'src/a.ts', mtime_ms: 10, size: 20 },
    ]);
    const walkAfterPublish = inventory.getWalkCount();

    const detector = new LanguageDetectorService(
      { ANALYSIS_DETECTOR_DENYLIST: ['node_modules'] } as never,
      { ensureLoaded: async () => {}, resolveParserId: () => null, getManifest: () => null } as never,
      { listByProjectId: async () => [] } as never,
    );
    const languages = await detector.detectLanguages(
      root,
      snap.files.map((f) => f.path),
    );
    expect(languages.some((l) => l.language === 'typescript')).toBe(true);

    const changeSet = new ChangeSetService(
      { ANALYSIS_DETECTOR_DENYLIST: ['node_modules'] } as never,
      { getByProjectId: async () => null, upsert: async () => ({}) } as never,
      { listByProjectId: async () => [] } as never,
      inventory,
    );
    const cs = await changeSet.buildChangeSet('proj', root, snap.files);
    expect(cs.added).toContain('src/a.ts');
    expect(inventory.getWalkCount()).toBe(walkAfterPublish);
  });
});
