import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import OnboardingSeed from './pages/OnboardingSeed.tsx';
import PortfolioDashboard from './pages/PortfolioDashboard.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import AuthCallback from './pages/AuthCallback.tsx';
import AnnouncementsPage from './pages/AnnouncementsPage.tsx';
import TradesPage from './pages/TradesPage.tsx';
import SubscriptionStatusPage from './pages/SubscriptionStatusPage.tsx';
import CommunityBoardPage from './pages/CommunityBoardPage.tsx';
import CommunityComposePage from './pages/CommunityComposePage.tsx';
import { useAuthBootstrap } from './hooks/useAuthBootstrap.ts';
import { useThemeStore } from './store/themeStore.ts';

const router = createBrowserRouter([
  { path: '/', element: <OnboardingSeed /> },
  { path: '/dashboard', element: <PortfolioDashboard /> },
  { path: '/trades', element: <TradesPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/subscription', element: <SubscriptionStatusPage /> },
  { path: '/announcements', element: <AnnouncementsPage /> },
  { path: '/community', element: <CommunityBoardPage /> },
  { path: '/community/new', element: <CommunityComposePage /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '*', element: <Navigate to="/" replace /> }
]);

export const AppRoot = () => {
  useAuthBootstrap();
  useThemeStore((state) => state.theme);
  return <RouterProvider router={router} />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRoot />
  </StrictMode>
);
