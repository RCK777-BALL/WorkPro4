import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle,
  Clock,
  Package,
  TrendingUp,
  Wrench,
} from 'lucide-react';

import { KpiCard } from '@/components/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

export function Dashboard() {
  const { data: summary } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: async () => {
      const result = await api.get('/dashboard/summary');
      return result.data;
    },
  });

  const { data: trends } = useQuery({
    queryKey: ['dashboard', 'trends'],
    queryFn: async () => {
      const result = await api.get('/dashboard/trends');
      return result.data;
    },
  });

  const { data: activity } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => {
      const result = await api.get('/dashboard/activity');
      return result.data;
    },
  });

  const sparklineData = trends?.slice(-7).map((t) => t.workOrdersCompleted) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back! Here's what's happening with your maintenance operations.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Open Work Orders"
          value={summary?.workOrders?.open ?? 0}
          icon={<Wrench className="w-6 h-6" />}
          color="blue"
          sparklineData={sparklineData}
        />
        <KpiCard
          title="Overdue"
          value={summary?.workOrders?.overdue ?? 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="red"
          trend={{
            value: -12,
            label: 'vs last month',
          }}
        />
        <KpiCard
          title="Completed This Month"
          value={summary?.workOrders?.completedThisMonth ?? 0}
          icon={<CheckCircle className="w-6 h-6" />}
          color="green"
          trend={{
            value: summary?.workOrders?.completedTrend ?? 0,
            label: 'vs last month',
          }}
        />
        <KpiCard
          title="Asset Uptime"
          value={`${summary?.assets?.uptime?.toFixed?.(1) ?? 0}%`}
          icon={<Building2 className="w-6 h-6" />}
          color="purple"
          trend={{
            value: 2.5,
            label: 'vs last month',
          }}
        />
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Total Assets"
          value={summary?.assets?.total ?? 0}
          icon={<Building2 className="w-6 h-6" />}
          color="blue"
        />
        <KpiCard
          title="Assets Down"
          value={summary?.assets?.down ?? 0}
          icon={<AlertTriangle className="w-6 h-6" />}
          color="orange"
        />
        <KpiCard
          title="Parts Inventory"
          value={summary?.inventory?.totalParts ?? 0}
          icon={<Package className="w-6 h-6" />}
          color="green"
        />
        <KpiCard
          title="Stock Health"
          value={`${summary?.inventory?.stockHealth?.toFixed?.(1) ?? 0}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activity?.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-start space-x-3 py-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{item.userName}</span>
                      <span className="text-gray-500">{item.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {item.entityType.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.entityName || `${item.entityType} ${item.entityId.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Work Orders Today</span>
                <span className="font-medium">
                  {trends?.slice(-1)[0]?.workOrdersCreated ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Today</span>
                <span className="font-medium text-green-600">
                  {trends?.slice(-1)[0]?.workOrdersCompleted ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Assets Operational</span>
                <span className="font-medium text-green-600">
                  {summary?.assets?.operational ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Low Stock Items</span>
                <span className="font-medium text-orange-600">
                  {summary?.inventory?.lowStock ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <Badge className="bg-green-100 text-green-800">Online</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <Badge className="bg-green-100 text-green-800">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Backup</span>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
