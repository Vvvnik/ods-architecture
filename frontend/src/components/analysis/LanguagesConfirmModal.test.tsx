import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LanguagesConfirmModal } from './LanguagesConfirmModal.js';
import type { ArtifactEntry, LanguageEntry } from '../../api/analysis-types.js';

const languages: LanguageEntry[] = [
  {
    language: 'csharp',
    file_count: 2,
    sample_paths: ['src/App.cs'],
    parser_id: 'csharp',
    parser_status: 'available',
  },
];

const artifacts: ArtifactEntry[] = [
  {
    artifact_type: 'compose',
    file_count: 1,
    sample_paths: ['docker-compose.yml'],
    parser_id: 'compose',
    parser_status: 'available',
  },
];

describe('LanguagesConfirmModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('highlights new languages and artifacts after a prior report', () => {
    render(
      <LanguagesConfirmModal
        open
        languages={languages}
        artifacts={artifacts}
        previousLanguageKeys={new Set()}
        previousArtifactKeys={new Set(['openapi'])}
        isFirstReport={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const csharpItem = within(dialog).getByText('csharp').closest('li');
    const composeItem = within(dialog).getByText('Docker Compose').closest('li');

    expect(csharpItem?.style.background).toBe('rgb(220, 252, 231)');
    expect(composeItem?.style.background).toBe('rgb(220, 252, 231)');
  });

  it('does not highlight entries on the first report', () => {
    render(
      <LanguagesConfirmModal
        open
        languages={languages}
        artifacts={artifacts}
        previousLanguageKeys={new Set()}
        previousArtifactKeys={new Set()}
        isFirstReport
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    const csharpItem = within(dialog).getByText('csharp').closest('li');
    expect(csharpItem?.style.background).toBe('');
  });

  it('calls confirm and cancel handlers', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <LanguagesConfirmModal
        open
        languages={languages}
        artifacts={[]}
        previousLanguageKeys={new Set(['csharp'])}
        previousArtifactKeys={new Set()}
        isFirstReport={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Continue' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('shows Frontend section for frontend-ui artifact and path-scoped languages', () => {
    const frontendLanguages: LanguageEntry[] = [
      {
        language: 'typescript',
        file_count: 12,
        sample_paths: ['frontend/src/main.tsx'],
        parser_id: 'typescript',
        parser_status: 'available',
        frontend: true,
      },
    ];
    const frontendArtifacts: ArtifactEntry[] = [
      {
        artifact_type: 'frontend-ui',
        file_count: 12,
        sample_paths: ['frontend/package.json'],
        parser_id: 'react-ui',
        parser_status: 'available',
      },
    ];

    render(
      <LanguagesConfirmModal
        open
        languages={languages}
        frontendLanguages={frontendLanguages}
        artifacts={frontendArtifacts}
        previousLanguageKeys={new Set()}
        previousArtifactKeys={new Set()}
        isFirstReport
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Frontend')).toBeTruthy();
    expect(within(dialog).getByText('frontend')).toBeTruthy();
    const uiParserRow = within(dialog).getByText('UI parser (react-ui)').closest('li');
    expect(uiParserRow?.textContent ?? '').toMatch(/Parser available/i);
    const typescriptRow = within(dialog).getByText('typescript').closest('li');
    expect(typescriptRow?.textContent ?? '').not.toMatch(/Parser not installed/i);
    expect(typescriptRow?.textContent ?? '').not.toMatch(/Parser available/i);
    expect(within(dialog).queryByText('System artifacts')).toBeNull();
  });
});
