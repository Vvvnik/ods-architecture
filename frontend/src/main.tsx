import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import './styles/workspace.css';
import { router } from './app/router.js';
import { SessionProvider } from './context/SessionContext.js';
import { QueryProvider } from './providers/QueryProvider.js';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element not found');
}

createRoot(root).render(
  <StrictMode>
    <QueryProvider>
      <SessionProvider>
        <RouterProvider router={router} />
      </SessionProvider>
    </QueryProvider>
  </StrictMode>,
);
