import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Command,
  LogOut,
  Search,
  Settings,
  User,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth';

import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function Header() {
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      setShowCommandPalette(true);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header
      className="gradient-header shadow-lg border-b border-white/20"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold">WorkPro CMMS</h1>
              <p className="text-white/80 text-sm">Acme Manufacturing</p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60" />
              <Input
                placeholder="Search work orders, assets... (Ctrl+K)"
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
                onClick={() => setShowCommandPalette(true)}
                readOnly
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <Badge variant="secondary" className="bg-white/20 text-white/80 text-xs">
                  <Command className="w-3 h-3 mr-1" />
                  K
                </Badge>
              </div>
            </div>

            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <Bell className="w-5 h-5" />
            </Button>

            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-white text-sm">
                <div className="font-medium">Authenticated User</div>
                <div className="text-white/70">Online</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={handleLogout}
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
