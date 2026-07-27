import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ChangesConfirmModal } from '../components/analysis/ChangesConfirmModal.js';
import { LanguagesConfirmModal } from '../components/analysis/LanguagesConfirmModal.js';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { useSync } from '../hooks/useSync.js';
import { formatAnalysisProgressHint, formatSyncProgressHint } from '../i18n/index.js';
import { useMessages } from '../i18n/locale.js';
import { useSession } from './SessionContext.js';

type AnalysisFlow = ReturnType<typeof useAnalysis>;

const AnalysisContext = createContext<AnalysisFlow | null>(null);

function ProgressOverlay({
  isSyncRunning,
  isAnalysisRunning,
  analysisHint,
  syncHint,
}: {
  isSyncRunning: boolean;
  isAnalysisRunning: boolean;
  analysisHint: string | null;
  syncHint: string | null;
}) {
  const messages = useMessages();

  if (!isSyncRunning && !isAnalysisRunning) {
    return null;
  }

  const label = isSyncRunning
    ? (syncHint ?? messages.GRAPH_VIEW_PROGRESS_SYNC)
    : (analysisHint ?? messages.GRAPH_VIEW_PROGRESS_ANALYSIS);

  return createPortal(
    <div className="analysis-progress-overlay" role="status" aria-live="polite">
      <div className="analysis-progress-banner">{label}</div>
    </div>,
    document.body,
  );
}

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { activeProjectId, setAnalysisRunning } = useSession();
  const analysis = useAnalysis(activeProjectId ?? undefined);
  const { isRunning, project } = useSync(activeProjectId ?? undefined);
  const wasSyncRunningRef = useRef(false);

  useEffect(() => {
    setAnalysisRunning(analysis.isAnalysisRunning);
  }, [analysis.isAnalysisRunning, setAnalysisRunning]);

  // Open language and change modals after a successful sync from any page.
  useEffect(() => {
    const status = project?.sync_status;
    const completed =
      wasSyncRunningRef.current &&
      !isRunning &&
      (status === 'success' || status === 'partial');

    if (completed) {
      void analysis.beginAfterSync();
    }

    wasSyncRunningRef.current = isRunning;
  }, [analysis.beginAfterSync, isRunning, project?.sync_status]);

  const analysisHint =
    analysis.isParserRunActive && analysis.activeRun
      ? formatAnalysisProgressHint(analysis.activeRun)
      : null;
  const syncHint = isRunning && project ? formatSyncProgressHint(project) : null;

  return (
    <AnalysisContext.Provider value={analysis}>
      {children}
      <ProgressOverlay
        isSyncRunning={isRunning}
        isAnalysisRunning={analysis.isParserRunActive && !isRunning}
        analysisHint={analysisHint}
        syncHint={syncHint}
      />
      <LanguagesConfirmModal
        open={analysis.step === 'languages'}
        languages={analysis.languageReport?.languages ?? []}
        frontendLanguages={analysis.languageReport?.frontend_languages}
        artifacts={analysis.languageReport?.artifacts ?? []}
        previousLanguageKeys={analysis.previousLanguageKeys}
        previousArtifactKeys={analysis.previousArtifactKeys}
        isFirstReport={analysis.isFirstReport}
        onConfirm={() => void analysis.confirmLanguages()}
        onCancel={analysis.cancelFlow}
      />
      <ChangesConfirmModal
        open={analysis.step === 'changes'}
        changeSet={analysis.changeSet}
        onConfirm={analysis.confirmChanges}
        onCancel={analysis.cancelFlow}
        isSubmitting={analysis.isStartingRun}
      />
      {analysis.toast ? (
        <div className="analysis-toast" role="status">
          {analysis.toast}
          <button type="button" onClick={analysis.clearToast}>
            ×
          </button>
        </div>
      ) : null}
    </AnalysisContext.Provider>
  );
}

export function useAnalysisFlow(): AnalysisFlow {
  const ctx = useContext(AnalysisContext);
  if (!ctx) {
    throw new Error('useAnalysisFlow must be used within AnalysisProvider');
  }
  return ctx;
}
