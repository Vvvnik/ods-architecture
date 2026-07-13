import { Navigate, useParams } from 'react-router-dom';

import { GraphPage } from '../pages/GraphPage.js';
import { useSession } from '../context/SessionContext.js';

/** Старый /graph → /projects/:id/graph, чтобы снимок не зависел только от sessionStorage. */
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
