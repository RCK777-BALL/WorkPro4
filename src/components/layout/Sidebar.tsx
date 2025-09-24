import { 
  LayoutDashboard, 
  Boxes, 
  ClipboardList, 
  CalendarCog, 
  Users, 
  PackageSearch, 
  Handshake, 
  FileText, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { useTheme } from '../../contexts/ThemeContext';
import { NavItem } from '../../types/nav';

interface SidebarProps {
  collapsed: boolean;
  onCollapseToggle: () => void;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: <LayoutDashboard /> },
  { label: 'Assets', to: '/assets', icon: <Boxes /> },
  { label: 'Work Orders', to: '/work-orders', icon: <ClipboardList /> },
  { label: 'Preventive Maintenance', to: '/pm', icon: <CalendarCog /> },
  { label: 'Teams', to: '/teams', icon: <Users /> },
  { label: 'Inventory', to: '/inventory', icon: <PackageSearch /> },
  { label: 'Vendors', to: '/vendors', icon: <Handshake /> },
  { label: 'Documents', to: '/documents', icon: <FileText /> },
  { label: 'Analytics', to: '/analytics', icon: <BarChart3 /> },
  { label: 'Settings', to: '/settings', icon: <Settings /> },
];

export function Sidebar({ collapsed, onCollapseToggle }: SidebarProps) {
  const { colors } = useTheme();

  return (
    <aside 
      className={`hidden lg:flex flex-col border-r transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
      style={{ backgroundColor: colors.background, borderColor: colors.border }}
    >
      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <SidebarItem
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Footer */}
      <div 
        className="p-4 border-t"
        style={{ borderColor: colors.border }}
      >
        <div className="flex items-center justify-between">
          {!collapsed && (
            <span className="text-xs" style={{ color: colors.mutedForeground }}>v0.1.0</span>
          )}
          <button
            onClick={onCollapseToggle}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: colors.mutedForeground }}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

export { navItems };
