import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type LeftPanelMode = 'files' | 'graph_stub';

interface SessionContextValue {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  leftPanelMode: LeftPanelMode;
  setLeftPanelMode: (mode: LeftPanelMode) => void;
  clearProjectContext: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    return sessionStorage.getItem('activeProjectId');
  });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>('files');

  const value = useMemo<SessionContextValue>(
    () => ({
      activeProjectId,
      setActiveProjectId: (id) => {
        setActiveProjectId(id);
        if (id) {
          sessionStorage.setItem('activeProjectId', id);
        } else {
          sessionStorage.removeItem('activeProjectId');
        }
      },
      selectedElementId,
      setSelectedElementId,
      leftPanelMode,
      setLeftPanelMode,
      clearProjectContext: () => {
        setSelectedElementId(null);
        setLeftPanelMode('files');
      },
    }),
    [activeProjectId, selectedElementId, leftPanelMode],
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
