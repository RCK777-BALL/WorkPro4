import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  Calendar,
  LayoutDashboard,
  LogOut,
  Package,
  Settings as SettingsIcon,
  ShoppingCart,
  Wrench,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Work Orders', href: '/work-orders', icon: Wrench },
  { name: 'Preventive Maintenance', href: '/pm', icon: Calendar },
  { name: 'Assets', href: '/assets', icon: Building2 },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Purchasing', href: '/purchasing', icon: ShoppingCart },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

const addOns = [
  { name: 'PowerBI Integration', href: '/addons/powerbi', icon: Zap, enabled: true },
  { name: 'SAP Connector', href: '/addons/sap', icon: Zap, enabled: false },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="flex flex-col h-full">
        <nav className="p-4 space-y-2 flex-1">
          <div className="space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                {item.name}
              </NavLink>
            ))}
          </div>

          <div className="pt-4">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Add-ons
              </h3>
            </div>
            <div className="space-y-1">
              {addOns.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      !item.enabled && 'opacity-50 cursor-not-allowed',
                      isActive && item.enabled
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )
                  }
                  onClick={!item.enabled ? (e) => e.preventDefault() : undefined}
                >
                  <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  {item.name}
                  {!item.enabled && (
                    <span className="ml-auto text-xs text-gray-400">Coming Soon</span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <SettingsIcon className="w-5 h-5 mr-3 flex-shrink-0" />
              Settings
            </NavLink>
          </div>
        </nav>
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log out
          </Button>
        </div>
      </div>
    </aside>
  );
}
