import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/layout/Layout';
import ErrorBoundary from './components/common/ErrorBoundary';

// Import pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import WorkOrders from './pages/WorkOrders';
import WorkOrderDetails from './pages/WorkOrderDetails';
import PM from './pages/PM';
import Teams from './pages/Teams';
import Inventory from './pages/Inventory';
import Vendors from './pages/Vendors';
import Documents from './pages/Documents';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
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
            </Route>
          </Routes>
        </ErrorBoundary>

      </QueryClientProvider>
    </ThemeProvider>
  );
}
