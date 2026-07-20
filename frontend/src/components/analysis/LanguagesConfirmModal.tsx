import type { ArtifactEntry, LanguageEntry } from '../../api/analysis-types.js';
import { analysisParserStatusLabel, artifactTypeLabel } from '../../i18n/index.js';
import { useMessages } from '../../i18n/locale.js';

interface LanguagesConfirmModalProps {
  open: boolean;
  languages: LanguageEntry[];
  artifacts: ArtifactEntry[];
  previousLanguageKeys: Set<string>;
  previousArtifactKeys: Set<string>;
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

function renderEntryRow(
  key: string,
  title: string,
  fileCount: number,
  samplePath: string | undefined,
  parserStatus: LanguageEntry['parser_status'],
  isNew: boolean,
  fileCountSuffix: string,
) {
  const highlight =
    isNew && parserStatus === 'available'
      ? '#dcfce7'
      : isNew && parserStatus === 'missing'
        ? '#fee2e2'
        : undefined;

  return (
    <li key={key} className="analysis-language-item" style={{ background: highlight }}>
      <div>
        <strong>{title}</strong> — {fileCount} {fileCountSuffix}
      </div>
      {samplePath && <div className="analysis-sample-path">{samplePath}</div>}
      <span className="analysis-badge" style={{ color: badgeColor(parserStatus) }}>
        {analysisParserStatusLabel(parserStatus)}
      </span>
    </li>
  );
}

export function LanguagesConfirmModal({
  open,
  languages,
  artifacts,
  previousLanguageKeys,
  previousArtifactKeys,
  isFirstReport,
  onConfirm,
  onCancel,
}: LanguagesConfirmModalProps) {
  const messages = useMessages();
  const {
    ANALYSIS_MODAL_ARTIFACTS_TITLE,
    ANALYSIS_MODAL_CANCEL,
    ANALYSIS_MODAL_CONTINUE,
    ANALYSIS_MODAL_LANGUAGES_SECTION,
    ANALYSIS_MODAL_LANGUAGES_TITLE,
  } = messages;
  if (!open) {
    return null;
  }

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="languages-modal-title">
        <h3 id="languages-modal-title">{ANALYSIS_MODAL_LANGUAGES_TITLE}</h3>
        <div className="modal-body">
          {languages.length > 0 && (
            <>
              <h4>{ANALYSIS_MODAL_LANGUAGES_SECTION}</h4>
              <ul className="analysis-language-list">
                {languages.map((entry) =>
                  renderEntryRow(
                    entry.language,
                    entry.language,
                    entry.file_count,
                    entry.sample_paths[0],
                    entry.parser_status,
                    !isFirstReport && !previousLanguageKeys.has(entry.language),
                    messages.ANALYSIS_FILE_COUNT_SUFFIX,
                  ),
                )}
              </ul>
            </>
          )}
          {artifacts.length > 0 && (
            <>
              <h4>{ANALYSIS_MODAL_ARTIFACTS_TITLE}</h4>
              <ul className="analysis-language-list">
                {artifacts.map((entry) =>
                  renderEntryRow(
                    entry.artifact_type,
                    artifactTypeLabel(entry.artifact_type, entry.parser_id),
                    entry.file_count,
                    entry.sample_paths[0],
                    entry.parser_status,
                    !isFirstReport && !previousArtifactKeys.has(entry.artifact_type),
                    messages.ANALYSIS_FILE_COUNT_SUFFIX,
                  ),
                )}
              </ul>
            </>
          )}
        </div>
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
