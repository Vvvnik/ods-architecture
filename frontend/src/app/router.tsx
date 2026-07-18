import { createBrowserRouter, Navigate } from 'react-router-dom';

import { GraphRedirect, ProjectGraphPage, ProjectGraphViewPage } from './GraphRoutes.js';
import { AppLayout } from '../layouts/AppLayout.js';
import { ImportPage } from '../pages/ImportPage.js';
import { NotFoundPage } from '../pages/NotFoundPage.js';
import { ProjectListPage } from '../pages/ProjectListPage.js';
import { WorkspacePage } from '../pages/WorkspacePage.js';
import { routerFuture } from './router-future.js';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppLayout />,
      children: [
        { index: true, element: <Navigate to="/projects" replace /> },
        { path: 'import', element: <ImportPage /> },
        { path: 'projects', element: <ProjectListPage /> },
        { path: 'projects/:projectId', element: <WorkspacePage /> },
        { path: 'projects/:projectId/graph', element: <ProjectGraphPage /> },
        { path: 'projects/:projectId/graph-view', element: <ProjectGraphViewPage /> },
        { path: 'graph', element: <GraphRedirect /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { future: routerFuture },
);
