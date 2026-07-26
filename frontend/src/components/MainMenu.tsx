import { NavLink, useParams } from 'react-router-dom';

import { useSession } from '../context/SessionContext.js';
import { useMessages } from '../i18n/locale.js';

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
  const { activeProjectId } = useSession();
  const messages = useMessages();
  const workspaceProjectId = projectId ?? activeProjectId;

  return (
    <nav aria-label={messages.mainMenuLabel} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <NavLink to="/import" style={linkStyle}>
        {messages.import}
      </NavLink>
      <NavLink to="/projects" style={linkStyle} end>
        {messages.projects}
      </NavLink>

      {workspaceProjectId ? (
        <>
          <NavLink to={`/projects/${workspaceProjectId}`} style={linkStyle} end>
            {messages.fileTree}
          </NavLink>
          <NavLink to={`/projects/${workspaceProjectId}/graph`} style={linkStyle}>
            {messages.GRAPH_MENU_ANALYSIS}
          </NavLink>
          <NavLink to={`/projects/${workspaceProjectId}/graph-view`} style={linkStyle}>
            {messages.GRAPH_MENU_VIEW}
          </NavLink>
          <NavLink to={`/projects/${workspaceProjectId}/graph-ui`} style={linkStyle}>
            {messages.GRAPH_MENU_UI}
          </NavLink>
          <NavLink to={`/projects/${workspaceProjectId}/docs`} style={linkStyle}>
            {messages.DOCS_MENU}
          </NavLink>
        </>
      ) : (
        <>
          <span style={disabledStyle} title={messages.openProjectForFileTree}>{messages.fileTree}</span>
          <NavLink to="/graph" style={linkStyle}>
            {messages.GRAPH_MENU_ANALYSIS}
          </NavLink>
          <span style={disabledStyle} title={messages.openProjectForGraphView}>
            {messages.GRAPH_MENU_VIEW}
          </span>
          <span style={disabledStyle} title={messages.openProjectForGraphUi}>
            {messages.GRAPH_MENU_UI}
          </span>
          <span style={disabledStyle} title={messages.openProjectForDocs}>
            {messages.DOCS_MENU}
          </span>
        </>
      )}
    </nav>
  );
}
