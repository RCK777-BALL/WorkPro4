import { BarChart3, Users, ClipboardList, AlertTriangle, TrendingUp, Building2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Dashboard() {
  const { colors } = useTheme();

  const kpiCards = [
    {
      title: 'Open Work Orders',
      value: '24',
      change: '+12%',
      changeType: 'positive',
      icon: ClipboardList,
      color: colors.primary
    },
    {
      title: 'Overdue Tasks',
      value: '3',
      change: '+2 from yesterday',
      changeType: 'negative',
      icon: AlertTriangle,
      color: colors.error
    },
    {
      title: 'Active Technicians',
      value: '12',
      change: 'All available',
      changeType: 'neutral',
      icon: Users,
      color: colors.success
    },
    {
      title: 'Completion Rate',
      value: '94%',
      change: '+3% from last month',
      changeType: 'positive',
      icon: BarChart3,
      color: colors.accent
    }
  ];

  const recentWorkOrders = [
    { id: 'WO-2024-001', title: 'Pump maintenance required', status: 'In Progress', priority: 'High' },
    { id: 'WO-2024-002', title: 'HVAC filter replacement', status: 'Assigned', priority: 'Medium' },
    { id: 'WO-2024-003', title: 'Conveyor belt inspection', status: 'Completed', priority: 'Low' }
  ];

  const assetStatus = [
    { name: 'Pump Station A', status: 'Operational', lastCheck: '2 hours ago', statusColor: colors.success },
    { name: 'Conveyor Line 2', status: 'Maintenance', lastCheck: '1 hour ago', statusColor: colors.warning },
    { name: 'HVAC Unit 3', status: 'Down', lastCheck: '30 minutes ago', statusColor: colors.error }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Dashboard</h1>
        <p className="mt-1" style={{ color: colors.mutedForeground }}>
          Welcome back! Here's what's happening with your maintenance operations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi, index) => (
          <div 
            key={index}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: colors.mutedForeground }}>{kpi.title}</p>
                <p className="text-3xl font-bold mt-1" style={{ color: colors.foreground }}>{kpi.value}</p>
                <p 
                  className="text-sm mt-1 flex items-center gap-1" 
                  style={{ 
                    color: kpi.changeType === 'positive' ? colors.success : 
                           kpi.changeType === 'negative' ? colors.error : colors.mutedForeground 
                  }}
                >
                  {kpi.changeType === 'positive' && <TrendingUp className="w-3 h-3" />}
                  {kpi.change}
                </p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${kpi.color}20` }}
              >
                <kpi.icon className="w-6 h-6" style={{ color: kpi.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <div 
          className="rounded-xl border p-6 shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>Recent Work Orders</h3>
          <div className="space-y-3">
            {recentWorkOrders.map((wo, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-80 transition-colors cursor-pointer"
                style={{ backgroundColor: `${colors.muted}80` }}
              >
                <div>
                  <p className="font-medium" style={{ color: colors.foreground }}>{wo.id}</p>
                  <p className="text-sm" style={{ color: colors.mutedForeground }}>{wo.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ 
                      backgroundColor: wo.status === 'Completed' ? `${colors.success}20` : 
                                     wo.status === 'In Progress' ? `${colors.warning}20` : `${colors.info}20`,
                      color: wo.status === 'Completed' ? colors.success : 
                             wo.status === 'In Progress' ? colors.warning : colors.info
                    }}
                  >
                    {wo.status}
                  </span>
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ 
                      backgroundColor: wo.priority === 'High' ? `${colors.error}20` : 
                                     wo.priority === 'Medium' ? `${colors.warning}20` : `${colors.success}20`,
                      color: wo.priority === 'High' ? colors.error : 
                             wo.priority === 'Medium' ? colors.warning : colors.success
                    }}
                  >
                    {wo.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asset Status */}
        <div 
          className="rounded-xl border p-6 shadow-sm"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>Asset Status</h3>
          <div className="space-y-3">
            {assetStatus.map((asset, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-lg hover:bg-opacity-80 transition-colors cursor-pointer"
                style={{ backgroundColor: `${colors.muted}80` }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${asset.statusColor}20` }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: asset.statusColor }} />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: colors.foreground }}>{asset.name}</p>
                    <p className="text-sm" style={{ color: colors.mutedForeground }}>Last checked {asset.lastCheck}</p>
                  </div>
                </div>
                <span 
                  className="px-2 py-1 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${asset.statusColor}20`,
                    color: asset.statusColor
                  }}
                >
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div 
        className="rounded-xl border p-6 shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Create Work Order', icon: ClipboardList, color: colors.primary },
            { label: 'Add Asset', icon: Building2, color: colors.success },
            { label: 'Schedule PM', icon: BarChart3, color: colors.accent },
            { label: 'View Reports', icon: BarChart3, color: colors.info }
          ].map((action, index) => (
            <button
              key={index}
              className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: `${action.color}10` }}
            >
              <action.icon className="w-6 h-6" style={{ color: action.color }} />
              <span className="text-sm font-medium" style={{ color: colors.foreground }}>{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}