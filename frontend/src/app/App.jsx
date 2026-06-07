import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './AppLayout';
import LoginPage from './LoginPage';
import { APP_ROUTES } from './routes';
import { InventoryAppProvider, useInventoryApp } from './useInventoryApp.jsx';
import { LoadingState } from '../components/ui.jsx';

function SessionLoadingScreen() {
  const { t } = useInventoryApp();

  return (
    <div className="page-shell">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
        <div className="w-full">
          <LoadingState title={t('status.checkingSession')} description={t('app.subtitle')} />
        </div>
      </div>
    </div>
  );
}

function AuthenticatedRoutes() {
  const { authLoading, user, can } = useInventoryApp();

  if (authLoading) {
    return <SessionLoadingScreen />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        {APP_ROUTES.map((route) => {
          const RouteComponent = route.component;
          return (
            <Route
              key={route.id}
              path={route.path}
              element={
                route.permission && !can(route.permission)
                  ? <Navigate to="/dashboard" replace />
                  : <RouteComponent />
              }
            />
          );
        })}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <InventoryAppProvider>
      <BrowserRouter>
        <AuthenticatedRoutes />
      </BrowserRouter>
    </InventoryAppProvider>
  );
}
