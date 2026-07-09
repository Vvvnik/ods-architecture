import type { ChangeSet } from '../../api/analysis-types.js';
import {
  ANALYSIS_MODAL_CANCEL,
  ANALYSIS_MODAL_CHANGES_TITLE,
  ANALYSIS_MODAL_CONTINUE,
  ANALYSIS_SECTION_ADDED,
  ANALYSIS_SECTION_DELETED,
  ANALYSIS_SECTION_MODIFIED,
  ANALYSIS_SECTION_WILL_ANALYZE,
} from '../../i18n/ru.js';

interface ChangesConfirmModalProps {
  open: boolean;
  changeSet: ChangeSet | null;
  onConfirm: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function PathSection({ title, paths }: { title: string; paths: string[] }) {
  if (paths.length === 0) {
    return null;
  }

  return (
    <section className="analysis-change-section">
      <h4>{title}</h4>
      <ul>
        {paths.map((path) => (
          <li key={path}>{path}</li>
        ))}
      </ul>
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

        {!changeSet.incremental ? (
          <PathSection title={ANALYSIS_SECTION_WILL_ANALYZE} paths={willAnalyze} />
        ) : (
          <>
            <PathSection title={ANALYSIS_SECTION_ADDED} paths={changeSet.added} />
            <PathSection title={ANALYSIS_SECTION_MODIFIED} paths={changeSet.modified} />
            <PathSection title={ANALYSIS_SECTION_DELETED} paths={changeSet.deleted} />
          </>
        )}

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
