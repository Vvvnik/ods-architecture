import { useState } from 'react';

import type { ChangeSet } from '../../api/analysis-types.js';
import {
  ANALYSIS_MODAL_CANCEL,
  ANALYSIS_MODAL_CHANGES_TITLE,
  ANALYSIS_MODAL_CONTINUE,
  ANALYSIS_MODAL_SHOW_MORE_PATHS,
  ANALYSIS_SECTION_ADDED,
  ANALYSIS_SECTION_DELETED,
  ANALYSIS_SECTION_MODIFIED,
  ANALYSIS_SECTION_WILL_ANALYZE,
} from '../../i18n/ru.js';

/** Initial visible paths per section — avoid dumping 1000 rows at once. */
const PATH_PAGE_SIZE = 50;

interface ChangesConfirmModalProps {
  open: boolean;
  changeSet: ChangeSet | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function PathSection({ title, paths }: { title: string; paths: string[] }) {
  const [visible, setVisible] = useState(PATH_PAGE_SIZE);

  if (paths.length === 0) {
    return null;
  }

  const shown = paths.slice(0, visible);
  const remaining = paths.length - shown.length;

  return (
    <section className="analysis-change-section">
      <h4>
        {title}{' '}
        <span className="analysis-path-count">({paths.length})</span>
      </h4>
      <ul>
        {shown.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
      {remaining > 0 ? (
        <button
          type="button"
          className="analysis-show-more"
          onClick={() => setVisible((n) => n + PATH_PAGE_SIZE)}
        >
          {ANALYSIS_MODAL_SHOW_MORE_PATHS(Math.min(PATH_PAGE_SIZE, remaining), remaining)}
        </button>
      ) : null}
    </section>
  );
}

export function ChangesConfirmModal({
  open,
  changeSet,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ChangesConfirmModalProps) {
  if (!open || !changeSet) {
    return null;
  }

  const willAnalyze = changeSet.incremental
    ? [...changeSet.added, ...changeSet.modified]
    : changeSet.added;

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="changes-modal-title">
        <h3 id="changes-modal-title">{ANALYSIS_MODAL_CHANGES_TITLE}</h3>

        <div className="modal-body">
          {!changeSet.incremental ? (
            <PathSection title={ANALYSIS_SECTION_WILL_ANALYZE} paths={willAnalyze} />
          ) : (
            <>
              <PathSection title={ANALYSIS_SECTION_ADDED} paths={changeSet.added} />
              <PathSection title={ANALYSIS_SECTION_MODIFIED} paths={changeSet.modified} />
              <PathSection title={ANALYSIS_SECTION_DELETED} paths={changeSet.deleted} />
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            {ANALYSIS_MODAL_CANCEL}
          </button>
          <button type="button" className="primary" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? 'Запуск…' : ANALYSIS_MODAL_CONTINUE}
          </button>
        </div>
      </div>
    </div>
  );
}
