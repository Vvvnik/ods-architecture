import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/HomePage.js';
import { OrdersPage } from '../pages/OrdersPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    children: [
      { index: true, element: <Navigate to="/home" replace /> },
      { path: 'home', element: <HomePage /> },
      { path: 'orders', element: <OrdersPage /> },
    ],
  },
]);
