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

  const config = {
    PORT: 3000,
    ELASTICSEARCH_URL: 'http://localhost:9200',
    DATA_ROOT: '/tmp/ods-data',
    LOCAL_REPOS_MOUNT: '/repos',
    GIT_CLONE_DEPTH: 1,
    ANALYSIS_DETECTOR_DENYLIST: ['node_modules', '.git'],
  };

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

    const projectRepository = {
      getById: vi.fn(async () => project),
      update: vi.fn(async (_id: string, patch: Partial<ProjectDocument>) => {
        projectUpdates.push(patch);
        project = { ...project, ...patch };
        return project;
      }),
    };

    const elementRepository = {
      findByPath: vi.fn(async () => null),
      upsert: vi.fn(async (element: Omit<ElementDocument, 'id'> & { id?: string }) => {
        const doc = { id: element.id ?? `el-${upserted.length + 1}`, ...element } as ElementDocument;
        upserted.push(doc);
        return doc;
      }),
      softDeleteExceptPaths: vi.fn(async () => 0),
      refresh: vi.fn(async () => {}),
      hasManualNotNeededAncestor: vi.fn(async () => false),
    };

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

  it('marks sync as partial when a broken symlink is encountered', async () => {
    await addBrokenSymlink(repoRoot, 'broken-link');

    await syncService.runSync(project.id);

    expect(project.sync_status).toBe('partial');
    expect(project.last_error_message).toMatch(/ошибк/i);
  });

  it('preserves manually set status on re-sync', async () => {
    const elementRepository = {
      findByPath: vi.fn(async (_projectId: string, path: string) => {
        if (path === 'README.md') {
          return {
            id: 'el-readme',
            project_id: project.id,
            path,
            parent_path: '',
            type: 'file',
            status: 'needed',
            is_active: false,
            status_manually_set: true,
          } satisfies ElementDocument;
        }
        return null;
      }),
      upsert: vi.fn(async (element: Omit<ElementDocument, 'id'> & { id?: string }) => {
        const doc = {
          id: element.id ?? 'new',
          ...element,
        } as ElementDocument;
        upserted.push(doc);
        return doc;
      }),
      softDeleteExceptPaths: vi.fn(async () => 0),
      refresh: vi.fn(async () => {}),
      hasManualNotNeededAncestor: vi.fn(async () => false),
    };

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
  });

  it('beginScheduledSync rejects when lock is held or sync_status is running', async () => {
    syncService.beginScheduledSync(project.id, 'idle');
    expect(() => syncService.beginScheduledSync(project.id, 'idle')).toThrow(AppError);

    await syncService.runSync(project.id);

    expect(() => syncService.beginScheduledSync(project.id, 'running')).toThrow(AppError);
  });
});
