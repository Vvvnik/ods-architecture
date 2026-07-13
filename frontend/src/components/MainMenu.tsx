import { NavLink, useParams } from 'react-router-dom';

import { useSession } from '../context/SessionContext.js';
import { useSync } from '../hooks/useSync.js';

const linkStyle = ({ isActive }: { isActive: boolean }) => ({
  display: 'block',
  padding: '8px 12px',
  color: isActive ? '#1a56db' : '#374151',
  textDecoration: 'none',
  fontWeight: isActive ? 600 : 400,
  borderRadius: 6,
  background: isActive ? '#eff6ff' : 'transparent',
});

const disabledStyle = {
  display: 'block',
  padding: '8px 12px',
  color: '#9ca3af',
  cursor: 'not-allowed',
};

export function MainMenu() {
  const { projectId } = useParams<{ projectId?: string }>();
  const { activeProjectId, analysisRunning } = useSession();
  const workspaceProjectId = projectId ?? activeProjectId;
  const syncProjectId = projectId ?? activeProjectId ?? undefined;

  const { canSync, isRunning, triggerSync, syncError } = useSync(syncProjectId);

  const canSyncWithAnalysis = canSync && !analysisRunning;

  return (
    <nav aria-label="Главное меню" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <NavLink to="/import" style={linkStyle}>
        Импорт
      </NavLink>
      <NavLink to="/projects" style={linkStyle} end>
        Проекты
      </NavLink>

      {syncProjectId ? (
        <button
          type="button"
          className="menu-sync-btn"
          disabled={!canSyncWithAnalysis}
          onClick={triggerSync}
          title={
            isRunning
              ? 'Синхронизация выполняется'
              : analysisRunning
                ? 'Анализ выполняется'
                : 'Запустить синхронизацию'
          }
        >
          {isRunning ? 'Синхронизация…' : 'Синхронизация'}
        </button>
      ) : (
        <span style={disabledStyle} title="Откройте проект для синхронизации">
          Синхронизация
        </span>
      )}

      {syncError && (
        <div className="sync-alert" role="alert">
          {syncError}
        </div>
      )}

      {workspaceProjectId ? (
        <>
          <NavLink to={`/projects/${workspaceProjectId}`} style={linkStyle} end>
            Файловая структура
          </NavLink>
          <NavLink to={`/projects/${workspaceProjectId}/graph`} style={linkStyle}>
            Граф
          </NavLink>
        </>
      ) : (
        <>
          <span style={disabledStyle}>Файловая структура</span>
          <NavLink to="/graph" style={linkStyle}>
            Граф
          </NavLink>
        </>
      )}
    </nav>
  );
}
