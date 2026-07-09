import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { getElement } from '../api/elements.js';
import type { Element } from '../api/models.js';
import { ChangesConfirmModal } from '../components/analysis/ChangesConfirmModal.js';
import { LanguagesConfirmModal } from '../components/analysis/LanguagesConfirmModal.js';
import { FileGraphPanel } from '../components/graph/FileGraphPanel.js';
import { ElementProperties } from '../components/ElementProperties.js';
import { FileTree } from '../components/FileTree.js';
import { FileViewer } from '../components/FileViewer.js';
import { SyncStatusBadge } from '../components/SyncStatusBadge.js';
import { useSession } from '../context/SessionContext.js';
import { useAnalysis } from '../hooks/useAnalysis.js';
import { useSync } from '../hooks/useSync.js';
import { errorMessageForCode } from '../i18n/ru.js';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout.js';
import { resolveElementByPath } from '../utils/resolveElementByPath.js';

export function WorkspacePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightPath = searchParams.get('highlightPath');
  const { setActiveProjectId, selectedElementId, setSelectedElementId, clearProjectContext, setAnalysisRunning } =
    useSession();

  const { project, isLoading, isRunning, isProjectNotFound } = useSync(projectId);
  const analysis = useAnalysis(projectId);
  const wasRunningRef = useRef(false);
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

  useEffect(() => {
    setAnalysisRunning(analysis.isAnalysisRunning);
  }, [analysis.isAnalysisRunning, setAnalysisRunning]);

  useEffect(() => {
    const status = project?.sync_status;
    const completed =
      wasRunningRef.current &&
      !isRunning &&
      (status === 'success' || status === 'partial');

    if (completed) {
      void analysis.beginAfterSync();
    }

    wasRunningRef.current = isRunning;
  }, [analysis, isRunning, project?.sync_status]);

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
    <>
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
      {analysis.toast && (
        <div className="analysis-toast" role="status">
          {analysis.toast}
          <button type="button" onClick={analysis.clearToast}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
