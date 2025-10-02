import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { navItems } from './Sidebar';

const SIDEBAR_STORAGE_KEY = 'wp3.sidebar.collapsed';

export function Layout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      return stored ? JSON.parse(stored) : false;
    } catch (error) {
      return false;
    }
  });
  
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        JSON.stringify(sidebarCollapsed),
      );
    } catch (error) {
      // Ignore storage write errors (e.g., unavailable localStorage)
    }
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    if (typeof window === 'undefined') {
      setSidebarCollapsed((prev) => !prev);
      return;
    }

    // On mobile, toggle mobile nav
    if (window.innerWidth < 1024) {
      setMobileNavOpen((prev) => !prev);
    } else {
      // On desktop, toggle sidebar collapse
      setSidebarCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={handleToggleSidebar} />
      
      <div className="flex">
        <Sidebar 
          collapsed={sidebarCollapsed} 
          onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        
        <MobileNav
          isOpen={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          navItems={navItems}
        />
        
        <main className={`flex-1 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'
        }`}>
          <div className="px-4 md:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}