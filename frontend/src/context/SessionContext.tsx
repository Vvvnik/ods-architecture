import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SessionContextValue {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  analysisRunning: boolean;
  setAnalysisRunning: (running: boolean) => void;
  clearProjectContext: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(() => {
    return sessionStorage.getItem('activeProjectId');
  });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [analysisRunning, setAnalysisRunning] = useState(false);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    if (id) {
      sessionStorage.setItem('activeProjectId', id);
    } else {
      sessionStorage.removeItem('activeProjectId');
    }
  }, []);

  const clearProjectContext = useCallback(() => {
    setSelectedElementId(null);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      activeProjectId,
      setActiveProjectId,
      selectedElementId,
      setSelectedElementId,
      analysisRunning,
      setAnalysisRunning,
      clearProjectContext,
    }),
    [activeProjectId, selectedElementId, analysisRunning, setActiveProjectId, clearProjectContext],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return ctx;
}
