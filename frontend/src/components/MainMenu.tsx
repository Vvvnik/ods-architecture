import { NavLink, useLocation, useParams } from 'react-router-dom';

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
  const location = useLocation();
  const { activeProjectId } = useSession();
  const workspaceProjectId = projectId ?? activeProjectId;
  const isWorkspace = location.pathname.startsWith('/projects/') && Boolean(projectId);

  const { canSync, isRunning, triggerSync, syncError } = useSync(isWorkspace ? projectId : undefined);

  return (
    <nav aria-label="Главное меню" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <NavLink to="/import" style={linkStyle}>
        Импорт
      </NavLink>
      <NavLink to="/projects" style={linkStyle} end>
        Проекты
      </NavLink>

      {isWorkspace && projectId ? (
        <button
          type="button"
          className="menu-sync-btn"
          disabled={!canSync}
          onClick={triggerSync}
          title={isRunning ? 'Синхронизация выполняется' : 'Запустить синхронизацию'}
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
          <NavLink to="/graph" style={linkStyle}>
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
