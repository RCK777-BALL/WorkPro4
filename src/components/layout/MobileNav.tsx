import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { useTheme } from '../../contexts/ThemeContext';
import { NavItem } from '../../types/nav';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
}

export function MobileNav({ isOpen, onClose, navItems }: MobileNavProps) {
  const { colors } = useTheme();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Mobile Sidebar */}
      <div 
        className="fixed inset-y-0 left-0 w-64 border-r z-50 lg:hidden"
        style={{ backgroundColor: colors.background, borderColor: colors.border }}
      >
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: colors.border }}
        >
          <h2 className="text-lg font-semibold" style={{ color: colors.foreground }}>WorkPro3</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: colors.mutedForeground }}
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <div key={item.to} onClick={onClose}>
              <SidebarItem
                to={item.to}
                label={item.label}
                icon={item.icon}
              />
            </div>
          ))}
        </nav>
      </div>
    </>
  );
}