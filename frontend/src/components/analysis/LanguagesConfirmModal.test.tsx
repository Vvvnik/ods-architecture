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
});
