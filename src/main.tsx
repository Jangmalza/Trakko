import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import OnboardingSeed from './pages/OnboardingSeed.tsx';
import PortfolioDashboard from './pages/PortfolioDashboard.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import AuthCallback from './pages/AuthCallback.tsx';

const router = createBrowserRouter([
  { path: '/', element: <OnboardingSeed /> },
  { path: '/dashboard', element: <PortfolioDashboard /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '*', element: <Navigate to="/" replace /> }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
