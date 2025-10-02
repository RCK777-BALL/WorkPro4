import { Outlet } from 'react-router-dom';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';

export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children || <Outlet />}
          <Toaster />
        </main>
      </div>
    </div>
  );
}
