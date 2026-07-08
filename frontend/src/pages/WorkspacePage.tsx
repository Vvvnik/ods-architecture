import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import { getElement } from '../api/elements.js';
import type { Element } from '../api/models.js';
import { ElementProperties } from '../components/ElementProperties.js';
import { FileTree } from '../components/FileTree.js';
import { FileViewer } from '../components/FileViewer.js';
import { SyncStatusBadge } from '../components/SyncStatusBadge.js';
import { useSession } from '../context/SessionContext.js';
import { useSync } from '../hooks/useSync.js';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout.js';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { setActiveProjectId, selectedElementId, setSelectedElementId, clearProjectContext } =
    useSession();

  const { project, isLoading, isRunning } = useSync(projectId);
  const [treeSelectedElement, setTreeSelectedElement] = useState<Element | null>(null);

  useEffect(() => {
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [projectId, setActiveProjectId]);

  useEffect(() => {
    setTreeSelectedElement(null);
    setSelectedElementId(null);
  }, [projectId, setSelectedElementId]);

  useEffect(() => {
    return () => {
      clearProjectContext();
    };
  }, [clearProjectContext]);

  const elementQuery = useQuery({
    queryKey: ['element', projectId, selectedElementId],
    queryFn: () => getElement(projectId!, selectedElementId!),
    enabled: Boolean(projectId && selectedElementId),
    retry: false,
  });

  const handleSelect = (element: Element) => {
    setSelectedElementId(element.id);
    setTreeSelectedElement(element);
  };

  if (!projectId) {
    return <p>Проект не выбран</p>;
  }

  if (isLoading && !project) {
    return <p>Загрузка проекта…</p>;
  }

  const selectedElement =
    elementQuery.data ??
    (treeSelectedElement?.id === selectedElementId ? treeSelectedElement : null);

  const isResolvingElement =
    Boolean(selectedElementId) && elementQuery.isFetching && !elementQuery.data;

  const elementResolveError =
    elementQuery.isError && selectedElementId && !elementQuery.data
      ? elementQuery.error
      : null;

  return (
    <WorkspaceLayout
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{project?.name ?? 'Проект'}</h2>
          {project && <SyncStatusBadge status={project.sync_status} />}
          {isRunning && (
            <span style={{ fontSize: 13, color: '#2563eb' }}>Обновление дерева…</span>
          )}
        </div>
      }
      left={
        <FileTree
          projectId={projectId}
          selectedElementId={selectedElementId}
          onSelect={handleSelect}
        />
      }
      center={
        <FileViewer
          projectId={projectId}
          element={selectedElement}
          hasSelection={Boolean(selectedElementId)}
          isResolvingElement={isResolvingElement}
          elementResolveError={elementResolveError}
        />
      }
      right={<ElementProperties projectId={projectId} element={selectedElement} />}
    />
  );
}
