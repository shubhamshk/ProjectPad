import React from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { ProjectChat } from './pages/ProjectChat';
import { Settings } from './pages/Settings';
import { Billing } from './pages/Billing';
import { Auth } from './pages/Auth';
import TermsOfService from './pages/TermsOfService';
import { useStore } from './store';
import { AppRoute } from './types';

// Protected Route Wrapper
const ProtectedRoute = () => {
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to={AppRoute.LOGIN} replace />;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path={AppRoute.LOGIN} element={<Auth />} />
        <Route path={AppRoute.TERMS_OF_SERVICE} element={<TermsOfService />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={AppRoute.DASHBOARD} replace />} />
            <Route path={AppRoute.DASHBOARD} element={<Dashboard />} />
            <Route path="/project/:id" element={<ProjectChat />} />
            <Route path={AppRoute.SETTINGS} element={<Settings />} />
            <Route path={AppRoute.BILLING} element={<Billing />} />
          </Route>
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;