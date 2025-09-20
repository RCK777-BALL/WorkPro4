import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { WorkOrders } from './pages/WorkOrders';
import { Assets } from './pages/Assets';
import { PreventiveMaintenance } from './pages/PreventiveMaintenance';
import { Inventory } from './pages/Inventory';
import { Purchasing } from './pages/Purchasing';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="work-orders" element={<WorkOrders />} />
            <Route path="pm" element={<PreventiveMaintenance />} />
            <Route path="assets" element={<Assets />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="purchasing" element={<Purchasing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="addons/*"
              element={<div className="p-8 text-center text-gray-500">Add-ons - Coming Soon</div>}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
