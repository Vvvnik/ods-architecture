import { rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChangeSetService } from '../../src/services/change-set.service.js';
import type { AnalysisRunRepository } from '../../src/repositories/analysis-run.repository.js';
import type { SyncSnapshotRepository } from '../../src/repositories/sync-snapshot.repository.js';
import { createTempGitRepo } from '../helpers/test-utils.js';

const config = {
  PORT: 3000,
  ELASTICSEARCH_URL: 'http://localhost:9200',
  DATA_ROOT: '/tmp/ods-data',
  LOCAL_REPOS_MOUNT: '/repos',
  GIT_CLONE_DEPTH: 1,
  PARSERS_ROOT: './parsers',
  ANALYSIS_PARSER_TIMEOUT_MS: 600_000,
  ANALYSIS_MAX_PARALLEL_PARSERS: 2,
  ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
};

describe('ChangeSetService', () => {
  let repoRoot: string;
  let syncSnapshotRepository: SyncSnapshotRepository;
  let analysisRunRepository: AnalysisRunRepository;
  let service: ChangeSetService;

  beforeEach(async () => {
    repoRoot = await createTempGitRepo({
      'src/app.ts': 'export const app = 1;',
      'src/main.ts': 'export const main = 2;',
      'Program.cs': 'class Program {}',
      'lib/util.py': 'print("ok")',
    });

    syncSnapshotRepository = {
      getByProjectId: vi.fn(),
      upsert: vi.fn(),
    } as unknown as SyncSnapshotRepository;

    analysisRunRepository = {
      listByProjectId: vi.fn().mockResolvedValue([
        {
          id: 'run-1',
          project_id: 'project-1',
          status: 'success',
        },
      ]),
    } as unknown as AnalysisRunRepository;

    service = new ChangeSetService(config, syncSnapshotRepository, analysisRunRepository);
  });

  afterEach(async () => {
    await rm(repoRoot, { recursive: true, force: true });
  });

  it('builds incremental change set from snapshot diff', async () => {
    const previousMtime = (await stat(join(repoRoot, 'Program.cs'))).mtimeMs;

    vi.mocked(syncSnapshotRepository.getByProjectId).mockResolvedValue({
      project_id: 'project-1',
      captured_at: new Date().toISOString(),
      files: [
        { path: 'Program.cs', mtime_ms: previousMtime, size: 18 },
        { path: 'src/app.ts', mtime_ms: 1, size: 20 },
        { path: 'ghost.cs', mtime_ms: 1, size: 10 },
      ],
    });

    await writeFile(join(repoRoot, 'Program.cs'), 'class Program { static void Main() {} }');
    await writeFile(join(repoRoot, 'src/new.ts'), 'export const created = true;');

    const changeSet = await service.buildChangeSet('project-1', repoRoot);

    expect(changeSet.incremental).toBe(true);
    expect(changeSet.modified).toContain('Program.cs');
    expect(changeSet.added).toContain('src/new.ts');
    expect(changeSet.deleted).toContain('ghost.cs');
  });

  it('classifies parser paths by language for incremental runs', () => {
    const changeSet = {
      project_id: 'project-1',
      incremental: true,
      added: ['src/new.ts'],
      modified: ['Program.cs'],
      deleted: ['lib/util.py', 'old.cs'],
    };

    const csharp = service.resolveParserChangeSet(changeSet, 'csharp');
    expect(csharp.spawn).toEqual(['Program.cs']);
    expect(csharp.deleted).toEqual(['old.cs']);

    const typescript = service.resolveParserChangeSet(changeSet, 'typescript');
    expect(typescript.spawn).toEqual(['src/new.ts']);
    expect(typescript.deleted).toEqual([]);
  });

  it('returns full non-incremental change set on first analysis', async () => {
    vi.mocked(analysisRunRepository.listByProjectId).mockResolvedValue([]);

    const changeSet = await service.buildChangeSet('project-1', repoRoot);

    expect(changeSet.incremental).toBe(false);
    expect(changeSet.added.length).toBeGreaterThan(0);
    expect(changeSet.modified).toEqual([]);
    expect(changeSet.deleted).toEqual([]);
  });
});
