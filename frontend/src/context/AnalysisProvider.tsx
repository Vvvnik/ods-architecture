import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

import { ChangesConfirmModal } from '../components/analysis/ChangesConfirmModal.js';
import { LanguagesConfirmModal } from '../components/analysis/LanguagesConfirmModal.js';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { useSync } from '../hooks/useSync.js';
import { useSession } from './SessionContext.js';

type AnalysisFlow = ReturnType<typeof useAnalysis>;

const AnalysisContext = createContext<AnalysisFlow | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { activeProjectId, setAnalysisRunning } = useSession();
  const analysis = useAnalysis(activeProjectId ?? undefined);
  const { isRunning, project } = useSync(activeProjectId ?? undefined);
  const wasSyncRunningRef = useRef(false);

  useEffect(() => {
    setAnalysisRunning(analysis.isAnalysisRunning);
  }, [analysis.isAnalysisRunning, setAnalysisRunning]);

  // После успешной sync — модалки языков/изменений (с любой страницы).
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

  return (
    <AnalysisContext.Provider value={analysis}>
      {children}
      <LanguagesConfirmModal
        open={analysis.step === 'languages'}
        languages={analysis.languageReport?.languages ?? []}
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
