import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarItemProps {
  to: string;
  label: string;
  icon: React.ReactNode;
  collapsed?: boolean;
}

export function SidebarItem({ to, label, icon, collapsed }: SidebarItemProps) {
  const { colors } = useTheme();

  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-xl transition-colors',
          collapsed && 'justify-center',
          isActive
            ? 'font-medium'
            : 'hover:bg-opacity-60'
        )
      }
      style={({ isActive }) => ({
        backgroundColor: isActive ? colors.muted : 'transparent',
        color: isActive ? colors.foreground : colors.mutedForeground,
        fontWeight: isActive ? '500' : '400'
      })}
      title={collapsed ? label : undefined}
    >
      <div className="flex-shrink-0 w-5 h-5">
        {icon}
      </div>
      {!collapsed && (
        <span className="truncate">{label}</span>
      )}
    </NavLink>
  );
}