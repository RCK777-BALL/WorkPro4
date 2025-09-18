"use strict";
exports.__esModule = true;
exports.Sidebar = void 0;
var react_router_dom_1 = require("react-router-dom");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var navigation = [
    { name: 'Dashboard', href: '/', icon: lucide_react_1.LayoutDashboard },
    { name: 'Work Orders', href: '/work-orders', icon: lucide_react_1.Wrench },
    { name: 'Preventive Maintenance', href: '/pm', icon: lucide_react_1.Calendar },
    { name: 'Assets', href: '/assets', icon: lucide_react_1.Building2 },
    { name: 'Inventory', href: '/inventory', icon: lucide_react_1.Package },
    { name: 'Purchasing', href: '/purchasing', icon: lucide_react_1.ShoppingCart },
    { name: 'Reports', href: '/reports', icon: lucide_react_1.BarChart3 },
];
var addOns = [
    { name: 'PowerBI Integration', href: '/addons/powerbi', icon: lucide_react_1.Zap, enabled: true },
    { name: 'SAP Connector', href: '/addons/sap', icon: lucide_react_1.Zap, enabled: false },
];
function Sidebar() {
    return (<aside className="w-64 bg-white shadow-sm border-r border-gray-200">
      <nav className="p-4 space-y-2">
        <div className="space-y-1">
          {navigation.map(function (item) { return (<react_router_dom_1.NavLink key={item.name} to={item.href} className={function (_a) {
                var isActive = _a.isActive;
                return (0, utils_1.cn)('flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors', isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900');
            }}>
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0"/>
              {item.name}
            </react_router_dom_1.NavLink>); })}
        </div>

        <div className="pt-4">
          <div className="px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Add-ons
            </h3>
          </div>
          <div className="space-y-1">
            {addOns.map(function (item) { return (<react_router_dom_1.NavLink key={item.name} to={item.href} className={function (_a) {
                var isActive = _a.isActive;
                return (0, utils_1.cn)('flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors', !item.enabled && 'opacity-50 cursor-not-allowed', isActive && item.enabled
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900');
            }} onClick={!item.enabled ? function (e) { return e.preventDefault(); } : undefined}>
                <item.icon className="w-5 h-5 mr-3 flex-shrink-0"/>
                {item.name}
                {!item.enabled && (<span className="ml-auto text-xs text-gray-400">Coming Soon</span>)}
              </react_router_dom_1.NavLink>); })}
          </div>
        </div>

        <div className="pt-4 mt-auto">
          <react_router_dom_1.NavLink to="/settings" className={function (_a) {
            var isActive = _a.isActive;
            return (0, utils_1.cn)('flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors', isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900');
        }}>
            <lucide_react_1.Settings className="w-5 h-5 mr-3 flex-shrink-0"/>
            Settings
          </react_router_dom_1.NavLink>
        </div>
      </nav>
    </aside>);
}
exports.Sidebar = Sidebar;
