import { useEffect, useState } from 'react';

import type { ChangeSet } from '../../api/analysis-types.js';
import { analysisModalShowMorePaths } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';

/** Initial visible paths per section — avoid dumping 1000 rows at once. */
const PATH_PAGE_SIZE = 50;

interface ChangesConfirmModalProps {
  open: boolean;
  changeSet: ChangeSet | null;
  onConfirm: (options?: { forceFull?: boolean }) => void;
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
          {analysisModalShowMorePaths(Math.min(PATH_PAGE_SIZE, remaining), remaining)}
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
  const messages = useMessages();
  const {
    ANALYSIS_MODAL_CANCEL,
    ANALYSIS_MODAL_CHANGES_TITLE,
    ANALYSIS_MODAL_CONTINUE,
    ANALYSIS_MODAL_FORCE_FULL,
    ANALYSIS_SECTION_ADDED,
    ANALYSIS_SECTION_DELETED,
    ANALYSIS_SECTION_MODIFIED,
    ANALYSIS_SECTION_WILL_ANALYZE,
  } = messages;
  const [forceFull, setForceFull] = useState(true);

  useEffect(() => {
    if (open) {
      setForceFull(true);
    }
  }, [open]);

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
              <label className="analysis-force-full">
                <input
                  type="checkbox"
                  checked={forceFull}
                  onChange={(event) => setForceFull(event.target.checked)}
                  disabled={isSubmitting}
                />{' '}
                {ANALYSIS_MODAL_FORCE_FULL}
              </label>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            {ANALYSIS_MODAL_CANCEL}
          </button>
          <button
            type="button"
            className="primary"
            onClick={() => onConfirm({ forceFull: changeSet.incremental ? forceFull : false })}
            disabled={isSubmitting}
          >
            {isSubmitting ? messages.ANALYSIS_MODAL_STARTING : ANALYSIS_MODAL_CONTINUE}
          </button>
        </div>
      </div>
    </div>
  );
}
