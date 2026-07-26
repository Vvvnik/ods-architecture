import { createBrowserRouter, Navigate } from 'react-router-dom';

import {
  GraphRedirect,
  ProjectGraphPage,
  ProjectGraphUiPage,
  ProjectGraphViewPage,
} from './GraphRoutes.js';
import { AppLayout } from '../layouts/AppLayout.js';
import { DocumentationPage } from '../pages/DocumentationPage.js';
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
        { path: 'projects/:projectId/graph-ui', element: <ProjectGraphUiPage /> },
        { path: 'projects/:projectId/docs', element: <DocumentationPage /> },
        { path: 'graph', element: <GraphRedirect /> },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ],
  { future: routerFuture },
);
