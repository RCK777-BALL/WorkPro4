import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { Bell, ChevronLeft, ChevronRight, LogOut, Menu, Moon, Search, Settings, Sun, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const STORAGE_KEY = 'workpro4.sidebar.collapsed';
const THEME_KEY = 'workpro4.theme';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/work-orders', label: 'Work Orders' },
  { to: '/assets', label: 'Assets' },
  { to: '/teams', label: 'Teams' },
  { to: '/settings', label: 'Settings' }
];

export default function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return stored ? stored === 'true' : false;
  });
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored) return stored === 'dark';
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, sidebarCollapsed ? 'true' : 'false');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const element = document.documentElement;
    element.classList.toggle('dark', dark);
    element.dataset.theme = dark ? 'dark' : 'light';
    window.localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light');
  }, [dark]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  const collapsed = sidebarCollapsed && !sidebarHovered;

  const currentSection = useMemo(() => navItems.find((item) => location.pathname.startsWith(item.to))?.label ?? '', [location.pathname]);

  return (
    <div className="grid min-h-screen grid-cols-[auto_1fr] bg-bg text-fg">
      <a href="#main" className="absolute left-3 top-3 z-50 -translate-y-16 rounded-full bg-brand px-4 py-2 text-sm font-medium text-white focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2">
        Skip to content
      </a>
      <aside
        className={`relative flex min-h-screen flex-col border-r border-border transition-[width] duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      >
        <div className="flex h-20 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-lg font-semibold text-white">WP</span>
            {!collapsed && <div className="text-lg font-semibold">WorkPro</div>}
          </div>
          <button
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="rounded-xl border border-border p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="mt-4 flex-1 space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                  isActive ? 'bg-brand text-white shadow-xl' : 'text-mutedfg hover:bg-muted hover:text-fg'
                }`
              }
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                {item.label.substring(0, 2)}
              </span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-6">
          <div className={`rounded-2xl border border-dashed border-border px-3 py-4 ${collapsed ? 'text-center' : ''}`}>
            <p className="text-xs uppercase tracking-wide text-mutedfg">Status</p>
            <p className="mt-2 text-sm font-semibold">System Normal</p>
            {!collapsed && <p className="mt-1 text-xs text-mutedfg">All integrations operating</p>}
          </div>
        </div>
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-4 border-b border-border bg-bg/80 px-8 py-5 backdrop-blur">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-border p-2 text-mutedfg hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
            aria-label="Toggle navigation"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
          >
            <Menu size={18} />
          </button>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-3 h-4 w-4 text-mutedfg" />
            <input
              type="search"
              placeholder="Search work orders, assets, teams..."
              className="w-full rounded-xl border border-border bg-white/70 py-3 pl-11 pr-4 text-sm text-fg shadow-sm outline-none transition focus:ring-2 focus:ring-brand dark:bg-muted"
              aria-label="Global search"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Notifications"
              className="rounded-xl border border-border p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              onClick={() => setDark((prev) => !prev)}
              className="rounded-xl border border-border p-2 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Toggle color theme"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="relative">
              <button
                type="button"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 rounded-xl border border-border bg-white/70 px-3 py-2 text-sm font-medium shadow-sm hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:bg-muted"
                onClick={() => setUserMenuOpen((prev) => !prev)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">JD</span>
                <span className="hidden text-left leading-tight sm:block">
                  Jordan D.
                  <span className="block text-xs font-normal text-mutedfg">Operations Admin</span>
                </span>
              </button>
              {userMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-bg p-2 text-sm shadow-xl"
                >
                  <button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-muted" role="menuitem">
                    <User size={16} />
                    View profile
                  </button>
                  <NavLink
                    to="/settings"
                    className="flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-muted"
                    role="menuitem"
                  >
                    <Settings size={16} /> Settings
                  </NavLink>
                  <button
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-danger hover:bg-danger/10"
                    role="menuitem"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                      navigate('/login');
                    }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main" className="flex-1 overflow-y-auto px-8 py-10">
          <div className="mb-6 text-sm text-mutedfg">{currentSection && `You are viewing: ${currentSection}`}</div>
          <div className="space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
