import type { LanguageEntry } from '../../api/analysis-types.js';
import {
  analysisParserStatusLabel,
  ANALYSIS_MODAL_CANCEL,
  ANALYSIS_MODAL_CONTINUE,
  ANALYSIS_MODAL_LANGUAGES_TITLE,
} from '../../i18n/ru.js';

interface LanguagesConfirmModalProps {
  open: boolean;
  languages: LanguageEntry[];
  previousLanguageKeys: Set<string>;
  isFirstReport: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function badgeColor(status: LanguageEntry['parser_status']): string {
  switch (status) {
    case 'available':
      return '#15803d';
    case 'failed':
      return '#b91c1c';
    default:
      return '#6b7280';
  }
}

export function LanguagesConfirmModal({
  open,
  languages,
  previousLanguageKeys,
  isFirstReport,
  onConfirm,
  onCancel,
}: LanguagesConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="languages-modal-title">
        <h3 id="languages-modal-title">{ANALYSIS_MODAL_LANGUAGES_TITLE}</h3>
        <ul className="analysis-language-list">
          {languages.map((entry) => {
            const isNew = !isFirstReport && !previousLanguageKeys.has(entry.language);
            const highlight =
              isNew && entry.parser_status === 'available'
                ? '#dcfce7'
                : isNew && entry.parser_status === 'missing'
                  ? '#fee2e2'
                  : undefined;

            return (
              <li
                key={entry.language}
                className="analysis-language-item"
                style={{ background: highlight }}
              >
                <div>
                  <strong>{entry.language}</strong> — {entry.file_count} файл(ов)
                </div>
                {entry.sample_paths[0] && (
                  <div className="analysis-sample-path">{entry.sample_paths[0]}</div>
                )}
                <span className="analysis-badge" style={{ color: badgeColor(entry.parser_status) }}>
                  {analysisParserStatusLabel(entry.parser_status)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            {ANALYSIS_MODAL_CANCEL}
          </button>
          <button type="button" className="primary" onClick={onConfirm}>
            {ANALYSIS_MODAL_CONTINUE}
          </button>
        </div>
      </div>
    </div>
  );
}
