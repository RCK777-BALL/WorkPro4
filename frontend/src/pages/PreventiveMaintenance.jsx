import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  CheckCircle,
  Clock,
  Gauge,
  Pause,
  Play,
  Plus,
  Search,
  Settings as SettingsIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/utils';

const mockPMTasks = [
  {
    id: '1',
    title: 'Monthly Pump Inspection',
    description: 'Check pump performance, vibration, and lubrication',
    assetName: 'Main Water Pump',
    type: 'calendar',
    rule: { every: { value: 30, unit: 'days' } },
    isActive: true,
    nextDueAt: '2024-02-15T09:00:00Z',
    estimatedHours: 2,
    lastGeneratedAt: '2024-01-15T09:00:00Z',
  },
  {
    id: '2',
    title: 'Conveyor Belt Maintenance',
    description: 'Lubricate bearings and check belt tension',
    assetName: 'Production Line Conveyor',
    type: 'meter',
    rule: { threshold: { meterId: 'runtime-hours', operator: 'gte', value: 500 } },
    isActive: true,
    nextDueAt: '2024-02-20T14:00:00Z',
    estimatedHours: 4,
    lastGeneratedAt: '2024-01-20T14:00:00Z',
  },
  {
    id: '3',
    title: 'HVAC Filter Replacement',
    description: 'Replace air filters and check system performance',
    assetName: 'HVAC Unit #3',
    type: 'calendar',
    rule: { every: { value: 3, unit: 'months' } },
    isActive: false,
    nextDueAt: '2024-03-01T10:00:00Z',
    estimatedHours: 1,
    lastGeneratedAt: null,
  },
];

export function PreventiveMaintenance() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: pmTasks = mockPMTasks, isLoading } = useQuery({
    queryKey: ['pm-tasks', { search, status: statusFilter }],
    queryFn: async () => {
      return mockPMTasks.filter((task) => {
        const matchesSearch =
          !search ||
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.assetName?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus =
          !statusFilter ||
          (statusFilter === 'active' && task.isActive) ||
          (statusFilter === 'inactive' && !task.isActive);
        return matchesSearch && matchesStatus;
      });
    },
  });

  const activeTasks = pmTasks.filter((task) => task.isActive).length;
  const inactiveTasks = pmTasks.filter((task) => !task.isActive).length;
  const overdueTasks = pmTasks.filter(
    (task) => task.isActive && task.nextDueAt && new Date(task.nextDueAt) < new Date(),
  ).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Preventive Maintenance</h1>
          <p className="text-gray-500">
            Schedule and manage preventive maintenance tasks
          </p>
        </div>
        <Button className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New PM Task
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{activeTasks}</div>
            <div className="text-sm text-gray-500">Active Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{inactiveTasks}</div>
            <div className="text-sm text-gray-500">Inactive Tasks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <div className="text-sm text-gray-500">Compliance</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search PM tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={statusFilter === 'active' ? 'default' : 'outline'}
          onClick={() => setStatusFilter(statusFilter === 'active' ? '' : 'active')}
        >
          Active Only
        </Button>
      </div>

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-4">
          {pmTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {task.title}
                      </h3>
                      <Badge className={task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {task.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="flex items-center">
                        {task.type === 'calendar' ? (
                          <Calendar className="w-3 h-3 mr-1" />
                        ) : (
                          <Gauge className="w-3 h-3 mr-1" />
                        )}
                        {task.type}
                      </Badge>
                    </div>

                    {task.description && (
                      <p className="text-gray-600 mb-3">{task.description}</p>
                    )}

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      {task.assetName && (
                        <div className="flex items-center">
                          <SettingsIcon className="w-4 h-4 mr-1" />
                          {task.assetName}
                        </div>
                      )}
                      {task.nextDueAt && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          Next due: {formatDateTime(task.nextDueAt)}
                        </div>
                      )}
                      {task.estimatedHours && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {task.estimatedHours}h estimated
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-sm text-gray-500">
                      {task.type === 'calendar' && task.rule.every && (
                        <span>
                          Repeats every {task.rule.every.value} {task.rule.every.unit}
                        </span>
                      )}
                      {task.type === 'meter' && task.rule.threshold && (
                        <span>
                          Triggers when {task.rule.threshold.meterId}{' '}
                          {task.rule.threshold.operator} {task.rule.threshold.value}
                        </span>
                      )}
                    </div>

                    {task.lastGeneratedAt && (
                      <div className="mt-2 text-sm text-gray-500">
                        Last generated: {formatDateTime(task.lastGeneratedAt)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        {task.isActive ? (
                          <>
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-1" />
                            Activate
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Generate
                      </Button>
                    </div>
                    {task.nextDueAt && new Date(task.nextDueAt) < new Date() && (
                      <Badge className="bg-red-100 text-red-800">Overdue</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                PM Schedule Calendar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Calendar view will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Upcoming Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Schedule timeline will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {pmTasks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No PM tasks found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first preventive maintenance task'}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New PM Task
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
