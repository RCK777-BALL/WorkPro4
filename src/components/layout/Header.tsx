import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Palette,
  Menu,
  Search,
  Plus, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  LogIn,
  ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeCustomizer } from '../ThemeCustomizer';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { colors } = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeCustomizerOpen, setThemeCustomizerOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const displayName = user?.name?.trim() || 'Guest User';
  const displayEmail = user?.email?.trim() || 'Not signed in';

  const handleLogin = () => {
    setUserMenuOpen(false);
    navigate('/login');
  };

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/login');
  };

  // Global search shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search') as HTMLInputElement;
        searchInput?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header 
        className="sticky top-0 z-30 h-16 border-b"
        style={{ backgroundColor: colors.background, borderColor: colors.border }}
      >
      <div className="flex items-center justify-between h-full px-4 md:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-muted rounded-lg transition-colors lg:hidden"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <span className="font-bold text-sm text-white">W3</span>
            </div>
            <h1 className="text-xl font-bold" style={{ color: colors.foreground }}>WorkPro3</h1>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
              style={{ color: colors.mutedForeground }}
            />
            <input
              id="global-search"
              type="text"
              placeholder="Search... (Ctrl+K)"
              className={cn(
                "w-full h-10 pl-10 pr-4 rounded-xl border",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
                "transition-all duration-200",
                searchFocused && "shadow-md"
              )}
              style={{ 
                backgroundColor: colors.background, 
                borderColor: colors.border,
                color: colors.foreground
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* New Work Order Button */}
          <button 
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
            style={{ backgroundColor: colors.primary, color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline">New Work Order</span>
          </button>

          {/* Theme Customizer Button */}
          <button 
            onClick={() => setThemeCustomizerOpen(true)}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            style={{ color: colors.mutedForeground }}
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button 
            className="relative p-2 rounded-lg transition-colors hover:opacity-80"
            style={{ color: colors.mutedForeground }}
          >
            <Bell className="w-5 h-5" />
            <span 
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.error }}
            ></span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-2 rounded-lg transition-colors hover:opacity-80"
              style={{ color: colors.mutedForeground }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: colors.muted }}
              >
                <User className="w-4 h-4" />
              </div>
              <ChevronDown className="w-4 h-4 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div 
                  className="absolute right-0 top-full mt-2 w-48 border rounded-xl shadow-lg z-20"
                  style={{ backgroundColor: colors.card, borderColor: colors.border }}
                >
                  <div className="p-2">
                    <div
                      className="px-3 py-2 text-sm border-b mb-2"
                      style={{ color: colors.mutedForeground, borderColor: colors.border }}
                    >
                      <div className="font-medium" style={{ color: colors.foreground }}>{displayName}</div>
                      <div>{displayEmail}</div>
                    </div>
                    {!isAuthenticated && (
                      <button
                        onClick={handleLogin}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                        style={{ color: colors.foreground }}
                      >
                        <LogIn className="w-4 h-4" />
                        Login
                      </button>
                    )}
                    {isAuthenticated && (
                      <>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                          style={{ color: colors.foreground }}
                        >
                          <User className="w-4 h-4" />
                          Profile
                        </button>
                        <button
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                          style={{ color: colors.foreground }}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </button>
                        <hr className="my-2" style={{ borderColor: colors.border }} />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors hover:opacity-80"
                          style={{ color: colors.error }}
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>

    <ThemeCustomizer
      isOpen={themeCustomizerOpen}
      onClose={() => setThemeCustomizerOpen(false)}
    />
    </>
  );
}
