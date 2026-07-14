import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChangesConfirmModal } from './ChangesConfirmModal.js';
import type { ChangeSet } from '../../api/analysis-types.js';

describe('ChangesConfirmModal', () => {
  afterEach(() => {
    cleanup();
  });

  it('keeps actions outside scroll body and paginates long path lists', () => {
    const paths = Array.from({ length: 120 }, (_, i) => `src/file-${i}.ts`);
    const changeSet: ChangeSet = {
      project_id: 'p1',
      incremental: false,
      added: paths,
      modified: [],
      deleted: [],
    };

    render(
      <ChangesConfirmModal
        open
        changeSet={changeSet}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('.modal-body')).toBeTruthy();
    expect(dialog.querySelector('.modal-actions')).toBeTruthy();

    expect(within(dialog).getByText('src/file-0.ts')).toBeTruthy();
    expect(within(dialog).queryByText('src/file-50.ts')).toBeNull();

    fireEvent.click(within(dialog).getByRole('button', { name: /Ещё 50/ }));
    expect(within(dialog).getByText('src/file-50.ts')).toBeTruthy();

    const continueBtn = within(dialog).getByRole('button', { name: 'Продолжить' });
    expect(continueBtn.closest('.modal-actions')).toBeTruthy();
  });
});
