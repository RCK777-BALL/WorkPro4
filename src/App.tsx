import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import { ToastProvider } from './components/ui/toast';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Assets = lazy(() => import('./pages/Assets'));
const WorkOrders = lazy(() => import('./pages/WorkOrders'));
const WorkOrderDetails = lazy(() => import('./pages/WorkOrderDetails'));
const PM = lazy(() => import('./pages/PM'));
const Teams = lazy(() => import('./pages/Teams'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Vendors = lazy(() => import('./pages/Vendors'));
const Documents = lazy(() => import('./pages/Documents'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ErrorBoundary>
          <Suspense fallback={<div className="grid min-h-screen place-items-center text-mutedfg">Loading...</div>}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={(
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              )}
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="assets" element={<Assets />} />
              <Route path="work-orders" element={<WorkOrders />} />
              <Route path="work-orders/:id" element={<WorkOrderDetails />} />
              <Route path="pm" element={<PM />} />
              <Route path="teams" element={<Teams />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="documents" element={<Documents />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </ErrorBoundary>
      </ToastProvider>
    </QueryClientProvider>
  );
}
