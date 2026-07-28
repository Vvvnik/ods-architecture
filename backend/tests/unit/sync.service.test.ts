import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ElementDocument } from '../../src/domain/element.js';
import type { ProjectDocument } from '../../src/domain/project.js';
import { AppError } from '../../src/domain/errors.js';
import { SyncService } from '../../src/services/sync.service.js';
import { FileInventoryService } from '../../src/services/file-inventory.service.js';
import { WorkspaceService } from '../../src/services/workspace.service.js';
import { addBrokenSymlink, createTempGitRepo } from '../helpers/test-utils.js';

describe('SyncService', () => {
  let repoRoot: string;
  let project: ProjectDocument;
  let upserted: ElementDocument[];
  let projectUpdates: Array<Partial<ProjectDocument>>;
  let syncService: SyncService;
  let existingByPath: Map<string, ElementDocument>;

  const config = {
    PORT: 3000,
    ELASTICSEARCH_URL: 'http://localhost:9200',
    DATA_ROOT: '/tmp/ods-data',
    LOCAL_REPOS_MOUNT: '/repos',
    GIT_CLONE_DEPTH: 1,
    ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
  };

  function makeElementRepo(initial: Map<string, ElementDocument> = new Map()) {
    existingByPath = new Map(initial);
    upserted = [];
    return {
      loadByProjectPathMap: vi.fn(async () => new Map(existingByPath)),
      loadActiveByProject: vi.fn(async () => new Map(existingByPath)),
      bulkUpsert: vi.fn(async (elements: ElementDocument[]) => {
        for (const doc of elements) {
          upserted.push(doc);
          existingByPath.set(doc.path, doc);
        }
      }),
      softDeleteExceptPaths: vi.fn(async () => 0),
      refresh: vi.fn(async () => {}),
      findByPath: vi.fn(async () => null),
      upsert: vi.fn(async () => {
        throw new Error('per-path upsert must not be used on sync hot path');
      }),
      hasManualNotNeededAncestor: vi.fn(async () => {
        throw new Error('per-path ancestor lookup must not be used on sync hot path');
      }),
    };
  }

  beforeEach(async () => {
    repoRoot = await createTempGitRepo({
      'README.md': '# test',
      'src/app.ts': 'export const app = 1;',
    });

    project = {
      id: 'project-1',
      name: 'Test',
      source_type: 'local_path',
      source_value: repoRoot,
      working_copy_root: repoRoot,
      created_at: new Date().toISOString(),
      last_sync_at: null,
      sync_status: 'idle',
      last_error_message: null,
    };

    upserted = [];
    projectUpdates = [];
    existingByPath = new Map();

    const projectRepository = {
      getById: vi.fn(async () => project),
      update: vi.fn(async (_id: string, patch: Partial<ProjectDocument>) => {
        projectUpdates.push(patch);
        project = { ...project, ...patch };
        return project;
      }),
    };

    const elementRepository = makeElementRepo();

    const workspaceService = new WorkspaceService(config);
    const fileInventory = new FileInventoryService();
    syncService = new SyncService(
      projectRepository as never,
      elementRepository as never,
      workspaceService,
      config as never,
      fileInventory,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('indexes repository files and excludes .git', async () => {
    await syncService.runSync(project.id);

    const paths = upserted.map((item) => item.path);
    expect(paths).toContain('README.md');
    expect(paths).toContain('src');
    expect(paths).toContain('src/app.ts');
    expect(paths.some((path) => path.includes('.git'))).toBe(false);
    expect(project.sync_status).toBe('success');
  });

  it('uses bulk upsert instead of per-path ES writes', async () => {
    const elementRepository = makeElementRepo();
    syncService = new SyncService(
      {
        getById: vi.fn(async () => project),
        update: vi.fn(async (_id: string, patch: Partial<ProjectDocument>) => {
          project = { ...project, ...patch };
          return project;
        }),
      } as never,
      elementRepository as never,
      new WorkspaceService(config),
      config as never,
      new FileInventoryService(),
    );

    await syncService.runSync(project.id);

    expect(elementRepository.loadByProjectPathMap).toHaveBeenCalledTimes(1);
    expect(elementRepository.bulkUpsert).toHaveBeenCalledTimes(1);
    expect(elementRepository.upsert).not.toHaveBeenCalled();
    expect(elementRepository.findByPath).not.toHaveBeenCalled();
    expect(elementRepository.hasManualNotNeededAncestor).not.toHaveBeenCalled();
    expect(upserted.length).toBeGreaterThanOrEqual(3);
  });

  it('marks sync as partial when a broken symlink is encountered', async () => {
    await addBrokenSymlink(repoRoot, 'broken-link');

    await syncService.runSync(project.id);

    expect(project.sync_status).toBe('partial');
    expect(project.last_error_message).toMatch(/error/i);
  });

  it('preserves manually set status on re-sync', async () => {
    const elementRepository = makeElementRepo(
      new Map([
        [
          'README.md',
          {
            id: 'el-readme',
            project_id: project.id,
            path: 'README.md',
            parent_path: '',
            type: 'file',
            status: 'needed',
            // Inactive → must be rewritten active with same manual status.
            is_active: false,
            status_manually_set: true,
          } satisfies ElementDocument,
        ],
      ]),
    );

    syncService = new SyncService(
      {
        getById: vi.fn(async () => project),
        update: vi.fn(async (_id: string, patch: Partial<ProjectDocument>) => {
          project = { ...project, ...patch };
          return project;
        }),
      } as never,
      elementRepository as never,
      new WorkspaceService(config),
      config as never,
      new FileInventoryService(),
    );

    await syncService.runSync(project.id);

    const readme = upserted.find((item) => item.path === 'README.md');
    expect(readme?.status).toBe('needed');
    expect(readme?.is_active).toBe(true);
    expect(readme?.status_manually_set).toBe(true);
  });

  it('inherits not_needed from a manual ancestor without per-path ES lookups', async () => {
    const elementRepository = makeElementRepo(
      new Map([
        [
          'src',
          {
            id: 'el-src',
            project_id: project.id,
            path: 'src',
            parent_path: '',
            type: 'directory',
            status: 'not_needed',
            is_active: true,
            status_manually_set: true,
          } satisfies ElementDocument,
        ],
      ]),
    );

    syncService = new SyncService(
      {
        getById: vi.fn(async () => project),
        update: vi.fn(async (_id: string, patch: Partial<ProjectDocument>) => {
          project = { ...project, ...patch };
          return project;
        }),
      } as never,
      elementRepository as never,
      new WorkspaceService(config),
      config as never,
      new FileInventoryService(),
    );

    await syncService.runSync(project.id);

    const app = upserted.find((item) => item.path === 'src/app.ts');
    expect(app?.status).toBe('not_needed');
    expect(app?.status_manually_set).toBe(false);
    expect(elementRepository.hasManualNotNeededAncestor).not.toHaveBeenCalled();
  });

  it('skips bulk upsert when scanned elements are unchanged', async () => {
    const initial = new Map<string, ElementDocument>([
      [
        'README.md',
        {
          id: 'el-readme',
          project_id: project.id,
          path: 'README.md',
          parent_path: '',
          type: 'file',
          status: 'auto_found',
          is_active: true,
          status_manually_set: false,
        },
      ],
      [
        'src',
        {
          id: 'el-src',
          project_id: project.id,
          path: 'src',
          parent_path: '',
          type: 'directory',
          status: 'auto_found',
          is_active: true,
          status_manually_set: false,
        },
      ],
      [
        'src/app.ts',
        {
          id: 'el-app',
          project_id: project.id,
          path: 'src/app.ts',
          parent_path: 'src',
          type: 'file',
          status: 'auto_found',
          is_active: true,
          status_manually_set: false,
        },
      ],
    ]);

    const elementRepository = makeElementRepo(initial);
    syncService = new SyncService(
      {
        getById: vi.fn(async () => project),
        update: vi.fn(async (_id: string, patch: Partial<ProjectDocument>) => {
          project = { ...project, ...patch };
          return project;
        }),
      } as never,
      elementRepository as never,
      new WorkspaceService(config),
      config as never,
      new FileInventoryService(),
    );

    await syncService.runSync(project.id);

    expect(elementRepository.bulkUpsert).not.toHaveBeenCalled();
    expect(project.sync_status).toBe('success');
  });

  it('beginScheduledSync rejects when lock is held or sync_status is running', async () => {
    syncService.beginScheduledSync(project.id, 'idle');
    expect(() => syncService.beginScheduledSync(project.id, 'idle')).toThrow(AppError);

    await syncService.runSync(project.id);

    expect(() => syncService.beginScheduledSync(project.id, 'running')).toThrow(AppError);
  });
});
