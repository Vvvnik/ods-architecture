import { Navigate, useParams } from 'react-router-dom';

import { GraphPage } from '../pages/GraphPage.js';
import { GraphUiPage } from '../pages/GraphUiPage.js';
import { GraphViewPage } from '../pages/GraphViewPage.js';
import { useSession } from '../context/SessionContext.js';

/** Redirect legacy /graph to /projects/:id/graph so snapshots do not rely only on sessionStorage. */
export function GraphRedirect() {
  const { activeProjectId } = useSession();
  if (activeProjectId) {
    return <Navigate to={`/projects/${activeProjectId}/graph`} replace />;
  }
  return <GraphPage />;
}

export function ProjectGraphPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <GraphPage routeProjectId={projectId} />;
}

export function ProjectGraphViewPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <GraphViewPage routeProjectId={projectId} />;
}

export function ProjectGraphUiPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <GraphUiPage routeProjectId={projectId} />;
}
