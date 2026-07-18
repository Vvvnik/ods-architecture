import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { routerFuture } from '../app/router-future.js';

vi.mock('../context/AnalysisProvider.js', () => ({
  useAnalysisFlow: () => ({
    step: 'idle',
    languageReport: null,
    changeSet: null,
    previousLanguageKeys: new Set<string>(),
    isFirstReport: true,
    toast: null,
    clearToast: vi.fn(),
    beginAfterSync: vi.fn(),
    cancelFlow: vi.fn(),
    confirmLanguages: vi.fn(),
    confirmChanges: vi.fn(),
    isAnalysisRunning: false,
    isParserRunActive: false,
    isStartingRun: false,
  }),
}));

vi.mock('../hooks/useSync.js', () => ({
  useSync: () => ({
    project: {
      id: 'proj-1',
      name: 'Sample',
      sync_status: 'success',
    },
    isLoading: false,
    isRunning: false,
    canSync: true,
    syncError: null,
    triggerSync: vi.fn(),
    clearSyncError: vi.fn(),
    isProjectNotFound: false,
    projectError: null,
  }),
}));

vi.mock('../api/elements.js', () => ({
  getElement: vi.fn(),
  getFileContent: vi.fn(),
  listChildren: vi.fn(),
}));

vi.mock('../utils/resolveElementByPath.js', () => ({
  resolveElementByPath: vi.fn(),
}));

vi.mock('../components/FileTree.js', () => ({
  FileTree: ({ onSelect }: { onSelect: (element: Element) => void }) => (
    <button type="button" onClick={() => onSelect(helloFile)}>
      Выбрать hello.ts
    </button>
  ),
}));

vi.mock('../components/graph/FileGraphPanel.js', () => ({
  FileGraphPanel: () => <div>File graph panel</div>,
}));

import type { Element } from '../api/models.js';
import { getElement, getFileContent } from '../api/elements.js';
import { SessionProvider } from '../context/SessionContext.js';
import { resolveElementByPath } from '../utils/resolveElementByPath.js';
import { WorkspacePage } from './WorkspacePage.js';

const helloFile: Element = {
  id: 'el-1',
  project_id: 'proj-1',
  path: 'src/hello.ts',
  parent_path: 'src',
  type: 'file',
  status: 'auto_found',
  is_active: true,
};

function renderWorkspace(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <MemoryRouter future={routerFuture} initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/projects/:projectId" element={<WorkspacePage />} />
          </Routes>
        </MemoryRouter>
      </SessionProvider>
    </QueryClientProvider>,
  );
}

describe('WorkspacePage US3/AC3', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('keeps file selection after click instead of resetting to choose-file placeholder', async () => {
    vi.mocked(getElement).mockResolvedValue(helloFile);
    vi.mocked(getFileContent).mockResolvedValue({ kind: 'text', content: 'export const hello = 1;' });

    const { container } = renderWorkspace('/projects/proj-1');

    expect(screen.getByText(/Выберите файл или папку/)).toBeInTheDocument();

    await screen.getByRole('button', { name: 'Выбрать hello.ts' }).click();

    expect(screen.queryByText(/Выберите файл или папку/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector('.file-viewer-editor')).toBeInTheDocument();
    });
  });
});

describe('WorkspacePage US5 highlightPath', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('selects file from highlightPath query param', async () => {
    vi.mocked(resolveElementByPath).mockResolvedValue(helloFile);
    vi.mocked(getElement).mockResolvedValue(helloFile);
    vi.mocked(getFileContent).mockResolvedValue({ kind: 'text', content: 'export const hello = 1;' });

    const { container } = renderWorkspace('/projects/proj-1?highlightPath=src/hello.ts');

    await waitFor(() => {
      expect(resolveElementByPath).toHaveBeenCalledWith('proj-1', 'src/hello.ts');
    });

    await waitFor(() => {
      expect(container.querySelector('.file-viewer-editor')).toBeInTheDocument();
    });
  });
});
