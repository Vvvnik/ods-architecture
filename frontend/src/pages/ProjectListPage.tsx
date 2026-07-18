import { Link } from 'react-router-dom';

import { SyncStatusBadge } from '../components/SyncStatusBadge.js';
import { useSession } from '../context/SessionContext.js';
import { useDeleteProject } from '../hooks/useDeleteProject.js';
import { useProjects } from '../hooks/useProjects.js';
import {
  DELETE_PROJECT_CONFIRM,
  PROJECT_LIST_ACTIVE_BADGE,
  SOURCE_TYPE_LABELS,
  errorMessageForCode,
} from '../i18n/ru.js';

export function ProjectListPage() {
  const { data: projects, isLoading, isError, error } = useProjects();
  const { activeProjectId, setActiveProjectId } = useSession();
  const { confirmAndDelete, deleteError, clearDeleteError, deletingProjectId, isDeleting } =
    useDeleteProject();

  if (isLoading) {
    return <p>Загрузка проектов…</p>;
  }

  if (isError) {
    const message =
      error instanceof Error ? error.message : errorMessageForCode('network_error');
    return <p role="alert">Ошибка: {message}</p>;
  }

  if (!projects?.length) {
    return (
      <div>
        <h2 style={{ marginTop: 0 }}>Проекты</h2>
        <p style={{ color: '#6b7280' }}>
          Проектов пока нет.{' '}
          <Link to="/import" style={{ color: '#2563eb' }}>
            Импортируйте первый проект
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ marginTop: 0 }}>Проекты</h2>
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
          + Импорт
        </Link>
      </div>

      {deleteError && (
        <p role="alert" style={{ marginTop: 12, color: '#dc2626' }}>
          {deleteError}{' '}
          <button type="button" onClick={clearDeleteError} style={{ marginLeft: 8 }}>
            Закрыть
          </button>
        </p>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
            <th style={{ padding: '8px 12px' }}>Имя</th>
            <th style={{ padding: '8px 12px' }}>Источник</th>
            <th style={{ padding: '8px 12px' }}>Статус sync</th>
            <th style={{ padding: '8px 12px' }}>Последний sync</th>
            <th style={{ padding: '8px 12px' }}>Ошибка</th>
            <th style={{ padding: '8px 12px' }}>Действия</th>
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
                      {PROJECT_LIST_ACTIVE_BADGE}
                    </span>
                  ) : null}
                </td>
                <td style={{ padding: '12px', color: '#6b7280', fontSize: 14 }}>
                  {SOURCE_TYPE_LABELS[project.source_type]}: {project.source_value}
                </td>
                <td style={{ padding: '12px' }}>
                  <SyncStatusBadge status={project.sync_status} />
                </td>
                <td style={{ padding: '12px', fontSize: 14, color: '#6b7280' }}>
                  {project.last_sync_at
                    ? new Date(project.last_sync_at).toLocaleString('ru-RU')
                    : '—'}
                </td>
                <td style={{ padding: '12px', fontSize: 14, color: '#dc2626' }}>
                  {project.last_error_message ?? '—'}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Link
                      to={`/projects/${project.id}`}
                      style={{ color: '#2563eb' }}
                      onClick={() => setActiveProjectId(project.id)}
                    >
                      Открыть
                    </Link>
                    <button
                      type="button"
                      onClick={() => confirmAndDelete(project.id, DELETE_PROJECT_CONFIRM)}
                      disabled={isDeleting && deletingProjectId === project.id}
                      style={{
                        color: '#dc2626',
                        background: 'none',
                        border: 'none',
                        cursor:
                          isDeleting && deletingProjectId === project.id ? 'wait' : 'pointer',
                        padding: 0,
                        font: 'inherit',
                      }}
                    >
                      {isDeleting && deletingProjectId === project.id ? 'Удаление…' : 'Удалить'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
