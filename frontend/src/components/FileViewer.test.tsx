import type { ComponentProps } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('../api/elements.js', () => ({
  getFileContent: vi.fn(),
}));

import { getFileContent } from '../api/elements.js';
import type { Element } from '../api/models.js';
import { FileViewer } from './FileViewer.js';

const fileElement: Element = {
  id: 'el-1',
  project_id: 'proj-1',
  path: 'src/hello.ts',
  parent_path: 'src',
  type: 'file',
  status: 'auto_found',
  is_active: true,
};

function renderViewer(props: Partial<ComponentProps<typeof FileViewer>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <FileViewer projectId="proj-1" element={null} {...props} />
    </QueryClientProvider>,
  );
}

describe('FileViewer US3/AC3', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows choose-file placeholder when nothing is selected', () => {
    renderViewer();
    expect(screen.getByText(/Выберите файл или папку/)).toBeInTheDocument();
  });

  it('shows loading while element metadata is resolving', () => {
    renderViewer({ hasSelection: true, isResolvingElement: true });
    expect(screen.getByText(/Загрузка элемента/)).toBeInTheDocument();
  });

  it('shows file content for a selected file instead of choose-file placeholder', async () => {
    vi.mocked(getFileContent).mockResolvedValue({ kind: 'text', content: 'export const x = 1;' });
    const { container } = renderViewer({ element: fileElement, hasSelection: true });

    await waitFor(() => {
      expect(container.querySelector('.file-viewer-editor')).toBeInTheDocument();
    });

    const editor = container.querySelector('.file-viewer-editor');
    expect(editor).not.toBeNull();
    expect(container.querySelector('.file-viewer-placeholder')).not.toBeInTheDocument();
    expect(within(editor as HTMLElement).getByText(/export/)).toBeInTheDocument();
    expect(within(editor as HTMLElement).getByText(/const/)).toBeInTheDocument();
  });

  it('shows API error when element metadata fetch failed', () => {
    renderViewer({
      hasSelection: true,
      elementResolveError: new Error('Элемент не найден'),
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Элемент не найден');
  });
});
