import { createContext, useContext, useEffect, type ReactNode } from 'react';

import { ChangesConfirmModal } from '../components/analysis/ChangesConfirmModal.js';
import { LanguagesConfirmModal } from '../components/analysis/LanguagesConfirmModal.js';
import { useSession } from './SessionContext.js';
import { useAnalysis } from '../hooks/useAnalysis.js';

type AnalysisFlow = ReturnType<typeof useAnalysis>;

const AnalysisContext = createContext<AnalysisFlow | null>(null);

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const { activeProjectId, setAnalysisRunning } = useSession();
  const analysis = useAnalysis(activeProjectId ?? undefined);

  useEffect(() => {
    setAnalysisRunning(analysis.isAnalysisRunning);
  }, [analysis.isAnalysisRunning, setAnalysisRunning]);

  return (
    <AnalysisContext.Provider value={analysis}>
      {children}
      <LanguagesConfirmModal
        open={analysis.step === 'languages'}
        languages={analysis.languageReport?.languages ?? []}
        previousLanguageKeys={analysis.previousLanguageKeys}
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
