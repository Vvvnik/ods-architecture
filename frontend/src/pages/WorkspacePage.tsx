import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { getElement } from '../api/elements.js';
import type { Element } from '../api/models.js';
import { FileGraphPanel } from '../components/graph/FileGraphPanel.js';
import { ElementProperties } from '../components/ElementProperties.js';
import { FileTree } from '../components/FileTree.js';
import { FileViewer } from '../components/FileViewer.js';
import { SyncStatusBadge } from '../components/SyncStatusBadge.js';
import { useAnalysisFlow } from '../context/AnalysisProvider.js';
import { useSession } from '../context/SessionContext.js';
import { useSync } from '../hooks/useSync.js';
import { errorMessageForCode, formatAnalysisProgressHint } from '../i18n/ru.js';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout.js';
import { resolveElementByPath } from '../utils/resolveElementByPath.js';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightPath = searchParams.get('highlightPath');
  const { setActiveProjectId, selectedElementId, setSelectedElementId, clearProjectContext } =
    useSession();

  const { project, isLoading, isRunning, isProjectNotFound } = useSync(projectId);
  const analysis = useAnalysisFlow();
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
    if (!projectId || !highlightPath) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const element = await resolveElementByPath(projectId, highlightPath);
      if (cancelled) {
        return;
      }

      if (element) {
        setSelectedElementId(element.id);
        setTreeSelectedElement(element);
      }

      setSearchParams(
        (prev) => {
          const cleared = new URLSearchParams(prev);
          cleared.delete('highlightPath');
          return cleared;
        },
        { replace: true },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [highlightPath, projectId, setSearchParams, setSelectedElementId]);

  useEffect(() => {
    return () => {
      clearProjectContext();
    };
  }, [clearProjectContext]);

  useEffect(() => {
    if (isProjectNotFound) {
      setActiveProjectId(null);
      navigate('/projects', { replace: true });
    }
  }, [isProjectNotFound, navigate, setActiveProjectId]);

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

  if (isProjectNotFound) {
    return <p role="alert">{errorMessageForCode('not_found')}</p>;
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
            <span style={{ fontSize: 13, color: '#2563eb' }}>Синхронизация…</span>
          )}
          {analysis.isParserRunActive && !isRunning ? (
            <span style={{ fontSize: 13, color: '#2563eb' }}>
              {analysis.activeRun
                ? formatAnalysisProgressHint(analysis.activeRun)
                : 'Анализ…'}
            </span>
          ) : null}
        </div>
      }
      left={
        <FileTree
          projectId={projectId}
          selectedElementId={selectedElementId}
          highlightPath={highlightPath}
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
      right={
        <div className="panel-padding">
          <ElementProperties projectId={projectId} element={selectedElement} />
          {selectedElement?.type === 'file' ? (
            <FileGraphPanel projectId={projectId} filePath={selectedElement.path} />
          ) : null}
        </div>
      }
    />
  );
}
