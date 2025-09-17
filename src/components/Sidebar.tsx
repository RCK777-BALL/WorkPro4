import { 
  LayoutDashboard, 
  Wrench, 
  Calendar, 
  Building2, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings,
  Puzzle
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Work Orders', href: '/work-orders', icon: Wrench },
  { name: 'Preventive Maintenance', href: '/pm', icon: Calendar },
  { name: 'Assets', href: '/assets', icon: Building2 },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Purchasing', href: '/purchasing', icon: ShoppingCart },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Add-ons', href: '/add-ons', icon: Puzzle },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  return (
    <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="mt-8 px-4">
        <ul className="space-y-2">
          {navigation.map((item) => (
            <li key={item.name}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  `flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}