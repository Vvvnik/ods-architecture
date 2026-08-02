import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getMessages } from '../i18n/index.js';
import { LocaleProvider } from '../i18n/locale.js';

vi.mock('../api/docs.js', () => ({
  downloadDocsCodePrompt: vi.fn(),
  downloadDocsPrompt: vi.fn(),
  exportDocsPack: vi.fn(),
  getCurrentAiJob: vi.fn(),
  listDocsTree: vi.fn(),
  readDocsContent: vi.fn(),
}));

vi.mock('../context/SessionContext.js', () => ({
  useSession: () => ({ setActiveProjectId: vi.fn() }),
}));

vi.mock('../components/DocsTree.js', () => ({
  DocsTree: () => <div data-testid="docs-tree" />,
}));

vi.mock('../layouts/WorkspaceLayout.js', () => ({
  WorkspaceLayout: ({ header, left, center, right }: {
    header: ReactNode;
    left: ReactNode;
    center: ReactNode;
    right: ReactNode;
  }) => (
    <div>{header}{left}{center}{right}</div>
  ),
}));

import {
  downloadDocsCodePrompt,
  downloadDocsPrompt,
  getCurrentAiJob,
  listDocsTree,
  readDocsContent,
} from '../api/docs.js';
import { DocumentationPage } from './DocumentationPage.js';

const messages = getMessages('en');

describe('DocumentationPage', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(listDocsTree).mockReset();
    vi.mocked(getCurrentAiJob).mockReset();
    vi.mocked(readDocsContent).mockReset();
    vi.mocked(downloadDocsPrompt).mockReset();
    vi.mocked(downloadDocsCodePrompt).mockReset();
    vi.mocked(listDocsTree).mockResolvedValue([{ path: 'AGENT-DOC.md', type: 'file' }]);
    vi.mocked(getCurrentAiJob).mockResolvedValue(null);
    vi.mocked(readDocsContent).mockResolvedValue({ path: 'AGENT-DOC.md', content: 'prompt' });
    vi.mocked(downloadDocsPrompt).mockResolvedValue({ content: 'docs prompt', jobId: 'docs-job' });
    vi.mocked(downloadDocsCodePrompt).mockResolvedValue({ content: 'code prompt', jobId: 'code-job' });
  });

  it('loads both job kinds and exposes dual prompt downloads', async () => {
    vi.mocked(listDocsTree).mockResolvedValue([
      { path: 'AGENT-DOC.md', type: 'file' },
      { path: 'AGENT-CODE.md', type: 'file' },
    ]);

    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/projects/p1/docs']}>
          <Routes>
            <Route path="/projects/:projectId/docs" element={<DocumentationPage />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>,
    );

    await waitFor(() => expect(readDocsContent).toHaveBeenCalledWith('p1', 'AGENT-DOC.md'));
    await waitFor(() => {
      expect(getCurrentAiJob).toHaveBeenCalledWith('p1', 'docs_from_es');
      expect(getCurrentAiJob).toHaveBeenCalledWith('p1', 'graph_from_wc');
    });

    const codeBtn = screen.getByRole('button', { name: messages.DOCS_DOWNLOAD_CODE_PROMPT });
    expect(codeBtn.hasAttribute('disabled')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: messages.DOCS_DOWNLOAD_PROMPT }));
    fireEvent.click(codeBtn);

    await waitFor(() => expect(downloadDocsPrompt).toHaveBeenCalledWith('p1', expect.any(Object)));
    await waitFor(() => expect(downloadDocsCodePrompt).toHaveBeenCalledWith('p1', expect.any(Object)));
  });

  it('disables code download until AGENT-CODE.md is seeded', async () => {
    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/projects/p1/docs']}>
          <Routes>
            <Route path="/projects/:projectId/docs" element={<DocumentationPage />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>,
    );

    await waitFor(() => expect(readDocsContent).toHaveBeenCalled());
    const codeBtn = screen.getByRole('button', { name: messages.DOCS_DOWNLOAD_CODE_PROMPT });
    expect(codeBtn.hasAttribute('disabled')).toBe(true);
    expect(codeBtn.getAttribute('title')).toBe(messages.DOCS_CODE_DOWNLOAD_DISABLED_HINT);
  });

  it('shows code job status and analysis run in properties', async () => {
    vi.mocked(getCurrentAiJob).mockImplementation(async (_projectId, kind = 'docs_from_es') => {
      if (kind === 'graph_from_wc') {
        return {
          id: 'code-job',
          project_id: 'p1',
          kind: 'graph_from_wc',
          status: 'succeeded',
          analysis_run_id: 'ed807dbe-c78b-435a-9c96-c11fa2148b2a',
          docs_language: 'en',
          docs_write_mode: 'overwrite',
          docs_generation_id: null,
          progress: null,
          summary: '68 nodes',
          created_at: '2026-08-02T00:00:00.000Z',
          updated_at: '2026-08-02T00:00:00.000Z',
        };
      }
      return null;
    });

    render(
      <LocaleProvider>
        <MemoryRouter initialEntries={['/projects/p1/docs']}>
          <Routes>
            <Route path="/projects/:projectId/docs" element={<DocumentationPage />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('docs-code-job-status').textContent).toBe('succeeded');
      expect(screen.getByTestId('docs-code-analysis-run').getAttribute('title')).toBe(
        'ed807dbe-c78b-435a-9c96-c11fa2148b2a',
      );
      expect(screen.getByText('68 nodes')).toBeTruthy();
    });
  });
});
