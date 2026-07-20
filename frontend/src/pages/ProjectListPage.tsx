import { Link } from 'react-router-dom';

import type { Project } from '../api/models.js';
import { SyncStatusBadge } from '../components/SyncStatusBadge.js';
import { useSession } from '../context/SessionContext.js';
import { useDeleteProject } from '../hooks/useDeleteProject.js';
import { useProjects } from '../hooks/useProjects.js';
import { useSync } from '../hooks/useSync.js';
import { errorMessageForCode } from '../i18n/index.js';
import { useLocale, useMessages } from '../i18n/locale.js';

const iconButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  padding: 0,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: '#fff',
  color: '#374151',
  cursor: 'pointer',
} as const;

function ProjectRowActions({
  project,
  setActiveProjectId,
  confirmAndDelete,
  deleting,
}: {
  project: Project;
  setActiveProjectId: (projectId: string) => void;
  confirmAndDelete: (projectId: string, message: string) => void;
  deleting: boolean;
}) {
  const messages = useMessages();
  const { analysisRunning } = useSession();
  const { canSync, triggerSync, syncError } = useSync(project.id);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link
          to={`/projects/${project.id}`}
          onClick={() => setActiveProjectId(project.id)}
          title={messages.actionOpen}
          aria-label={messages.actionOpen}
          style={{ ...iconButtonStyle, color: '#2563eb' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 7h7l2 2h9v10H3V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M3 7V5h7l2 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </Link>
        <button
          type="button"
          onClick={triggerSync}
          disabled={!canSync || analysisRunning}
          title={messages.actionSync}
          aria-label={messages.actionSync}
          style={{ ...iconButtonStyle, opacity: !canSync || analysisRunning ? 0.5 : 1 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 7h-5V2M4 17h5v5M19 12a7 7 0 0 0-12-5L4 10M5 12a7 7 0 0 0 12 5l3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => confirmAndDelete(project.id, messages.DELETE_PROJECT_CONFIRM)}
          disabled={deleting}
          title={messages.actionDelete}
          aria-label={messages.actionDelete}
          style={{ ...iconButtonStyle, color: '#dc2626', cursor: deleting ? 'wait' : 'pointer' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {syncError ? <div role="alert" style={{ marginTop: 6, color: '#dc2626', fontSize: 12 }}>{syncError}</div> : null}
    </>
  );
}

export function ProjectListPage() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const { activeProjectId, setActiveProjectId } = useSession();
  const { locale } = useLocale();
  const messages = useMessages();
  const { confirmAndDelete, deleteError, clearDeleteError, deletingProjectId, isDeleting } =
    useDeleteProject();

  if (isLoading) {
    return <p>{messages.loadingProjects}</p>;
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : errorMessageForCode('network_error');
    return <p role="alert">{messages.projectsLoadError}: {message}</p>;
  }

  if (!projects?.length) {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>{messages.projects}</h2>
        <p style={{ color: '#6b7280' }}>
          {messages.noProjects}{' '}
          <Link to="/import" style={{ color: '#2563eb' }}>
            {messages.importFirstProject}
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginTop: 0 }}>{messages.projects}</h2>
        <Link
          to="/import"
          style={{
            padding: '8px 12px',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 6,
            textDecoration: 'none',
            fontSize: 14,
          }}
        >
          + {messages.import}
        </Link>
      </div>

      {deleteError && (
        <p role="alert" style={{ marginTop: 12, color: '#dc2626' }}>
          {deleteError}{' '}
          <button type="button" onClick={clearDeleteError} style={{ marginLeft: 8 }}>
            {messages.close}
          </button>
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '8px 12px' }}>{messages.name}</th>
            <th style={{ padding: '8px 12px' }}>{messages.source}</th>
            <th style={{ padding: '8px 12px' }}>{messages.syncStatus}</th>
            <th style={{ padding: '8px 12px' }}>{messages.lastSync}</th>
            <th style={{ padding: '8px 12px' }}>{messages.error}</th>
            <th style={{ padding: '8px 12px' }}>{messages.actions}</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => {
            const isActive = activeProjectId === project.id;
            return (
              <tr
                key={project.id}
                aria-current={isActive ? 'true' : undefined}
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  background: isActive ? '#eff6ff' : undefined,
                  boxShadow: isActive ? 'inset 3px 0 0 #2563eb' : undefined,
                }}
              >
                <td style={{ padding: '12px' }}>
                  <span style={{ fontWeight: isActive ? 600 : undefined }}>{project.name}</span>
                  {isActive ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#1d4ed8',
                        background: '#dbeafe',
                        borderRadius: 4,
                        padding: '2px 6px',
                      }}
                    >
                      {messages.PROJECT_LIST_ACTIVE_BADGE}
                    </span>
                  ) : null}
                </td>
                <td style={{ padding: '12px', color: '#6b7280', fontSize: 14 }}>
                  {messages.SOURCE_TYPE_LABELS[project.source_type]}: {project.source_value}
                </td>
                <td style={{ padding: '12px' }}>
                  <SyncStatusBadge status={project.sync_status} />
                </td>
                <td style={{ padding: '12px', fontSize: 14, color: '#6b7280' }}>
                  {project.last_sync_at
                    ? new Date(project.last_sync_at).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')
                    : '—'}
                </td>
                <td style={{ padding: '12px', fontSize: 14, color: '#dc2626' }}>
                  {project.last_error_message ?? '—'}
                </td>
                <td style={{ padding: '12px' }}>
                  <ProjectRowActions
                    project={project}
                    setActiveProjectId={setActiveProjectId}
                    confirmAndDelete={confirmAndDelete}
                    deleting={isDeleting && deletingProjectId === project.id}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
