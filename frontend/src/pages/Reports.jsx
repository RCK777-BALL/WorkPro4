import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Building2,
  Calendar as CalendarIcon,
  Clock,
  Download,
  Package,
  TrendingUp,
  Wrench,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const mockReportData = {
  workOrderMetrics: {
    totalCompleted: 145,
    avgCompletionTime: 4.2,
    onTimeCompletion: 87,
    overdueCount: 12,
  },
  assetMetrics: {
    totalAssets: 234,
    uptime: 94.5,
    mtbf: 720,
    mttr: 3.8,
  },
  inventoryMetrics: {
    totalParts: 1250,
    stockValue: 125000,
    lowStockItems: 23,
    turnoverRate: 4.2,
  },
  costMetrics: {
    maintenanceCosts: 45000,
    laborCosts: 28000,
    partsCosts: 17000,
    budgetVariance: -5.2,
  },
};

const reports = [
  {
    id: 'work-order-summary',
    name: 'Work Order Summary',
    description: 'Comprehensive work order performance metrics',
    icon: Wrench,
    category: 'Operations',
  },
  {
    id: 'asset-performance',
    name: 'Asset Performance',
    description: 'Asset uptime, reliability, and maintenance metrics',
    icon: Building2,
    category: 'Assets',
  },
  {
    id: 'inventory-analysis',
    name: 'Inventory Analysis',
    description: 'Stock levels, usage patterns, and cost analysis',
    icon: Package,
    category: 'Inventory',
  },
  {
    id: 'maintenance-costs',
    name: 'Maintenance Costs',
    description: 'Cost breakdown and budget variance analysis',
    icon: BarChart3,
    category: 'Financial',
  },
];

export function Reports() {
  const [dateRange, setDateRange] = useState('30d');

  const { data: reportData = mockReportData, isLoading } = useQuery({
    queryKey: ['reports', dateRange],
    queryFn: async () => mockReportData,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">
            Comprehensive insights into your maintenance operations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="flex items-center" onClick={() => setDateRange('30d')}>
            <CalendarIcon className="w-4 h-4 mr-2" />
            Last 30 Days
          </Button>
          <Button variant="outline" className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Work Orders Completed</p>
                <p className="text-3xl font-bold">{reportData.workOrderMetrics.totalCompleted}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +12% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Asset Uptime</p>
                <p className="text-3xl font-bold">{reportData.assetMetrics.uptime}%</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +2.1% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                <p className="text-3xl font-bold">{reportData.workOrderMetrics.avgCompletionTime}h</p>
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1 rotate-180" />
                  +0.3h vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-3xl font-bold">
                  ${ (reportData.inventoryMetrics.stockValue / 1000).toFixed(0)}K
                </p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  +5.2% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Work Order Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">On-Time Completion</span>
                    <span className="font-medium">{reportData.workOrderMetrics.onTimeCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${reportData.workOrderMetrics.onTimeCompletion}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overdue Work Orders</span>
                    <span className="font-medium text-red-600">
                      {reportData.workOrderMetrics.overdueCount}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Completion Time</span>
                    <span className="font-medium">
                      {reportData.workOrderMetrics.avgCompletionTime} hours
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Asset Reliability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overall Uptime</span>
                    <span className="font-medium">{reportData.assetMetrics.uptime}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${reportData.assetMetrics.uptime}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">MTBF (Mean Time Between Failures)</span>
                    <span className="font-medium">{reportData.assetMetrics.mtbf} hours</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">MTTR (Mean Time To Repair)</span>
                    <span className="font-medium">{reportData.assetMetrics.mttr} hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Available Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <report.icon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {report.category}
                          </span>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Card>
            <CardHeader>
              <CardTitle>Operations Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Detailed operations reports will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Asset Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Asset performance and reliability reports will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Cost analysis and budget reports will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
