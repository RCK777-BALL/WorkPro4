"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.PreventiveMaintenance = void 0;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var badge_1 = require("@/components/ui/badge");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function PreventiveMaintenance() {
    var _this = this;
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(''), statusFilter = _b[0], setStatusFilter = _b[1];
    // Mock data for PM tasks
    var mockPMTasks = [
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
            lastGeneratedAt: '2024-01-15T09:00:00Z'
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
            lastGeneratedAt: '2024-01-20T14:00:00Z'
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
            lastGeneratedAt: null
        },
    ];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['pm-tasks', { search: search, status: statusFilter }],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, mockPMTasks.filter(function (task) {
                        var _a;
                        var matchesSearch = !search ||
                            task.title.toLowerCase().includes(search.toLowerCase()) ||
                            ((_a = task.assetName) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(search.toLowerCase()));
                        var matchesStatus = !statusFilter ||
                            (statusFilter === 'active' && task.isActive) ||
                            (statusFilter === 'inactive' && !task.isActive);
                        return matchesSearch && matchesStatus;
                    })];
            });
        }); }
    }), _d = _c.data, pmTasks = _d === void 0 ? mockPMTasks : _d, isLoading = _c.isLoading;
    var activeTasks = pmTasks.filter(function (task) { return task.isActive; }).length;
    var inactiveTasks = pmTasks.filter(function (task) { return !task.isActive; }).length;
    var overdueTasks = pmTasks.filter(function (task) {
        return task.isActive && task.nextDueAt && new Date(task.nextDueAt) < new Date();
    }).length;
    if (isLoading) {
        return (<div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map(function (_, i) { return (<div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>); })}
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Preventive Maintenance</h1>
          <p className="text-gray-500">Schedule and manage preventive maintenance tasks</p>
        </div>
        <button_1.Button className="flex items-center">
          <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
          New PM Task
        </button_1.Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{activeTasks}</div>
            <div className="text-sm text-gray-500">Active Tasks</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{inactiveTasks}</div>
            <div className="text-sm text-gray-500">Inactive Tasks</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{overdueTasks}</div>
            <div className="text-sm text-gray-500">Overdue</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">85%</div>
            <div className="text-sm text-gray-500">Compliance</div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input_1.Input placeholder="Search PM tasks..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="pl-10"/>
        </div>
        <button_1.Button variant={statusFilter === 'active' ? 'default' : 'outline'} onClick={function () { return setStatusFilter(statusFilter === 'active' ? '' : 'active'); }}>
          Active Only
        </button_1.Button>
      </div>

      <tabs_1.Tabs defaultValue="tasks" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="tasks">Tasks</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="calendar">Calendar</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="schedule">Schedule</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="tasks" className="space-y-4">
          {pmTasks.map(function (task) { return (<card_1.Card key={task.id} className="hover:shadow-md transition-shadow">
              <card_1.CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {task.title}
                      </h3>
                      <badge_1.Badge className={task.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {task.isActive ? 'Active' : 'Inactive'}
                      </badge_1.Badge>
                      <badge_1.Badge variant="outline" className="flex items-center">
                        {task.type === 'calendar' ? (<lucide_react_1.Calendar className="w-3 h-3 mr-1"/>) : (<lucide_react_1.Gauge className="w-3 h-3 mr-1"/>)}
                        {task.type}
                      </badge_1.Badge>
                    </div>
                    
                    {task.description && (<p className="text-gray-600 mb-3">
                        {task.description}
                      </p>)}

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      {task.assetName && (<div className="flex items-center">
                          <lucide_react_1.Settings className="w-4 h-4 mr-1"/>
                          {task.assetName}
                        </div>)}
                      {task.nextDueAt && (<div className="flex items-center">
                          <lucide_react_1.Clock className="w-4 h-4 mr-1"/>
                          Next due: {(0, utils_1.formatDateTime)(task.nextDueAt)}
                        </div>)}
                      {task.estimatedHours && (<div className="flex items-center">
                          <lucide_react_1.Clock className="w-4 h-4 mr-1"/>
                          {task.estimatedHours}h estimated
                        </div>)}
                    </div>

                    <div className="mt-3 text-sm text-gray-500">
                      {task.type === 'calendar' && task.rule.every && (<span>Repeats every {task.rule.every.value} {task.rule.every.unit}</span>)}
                      {task.type === 'meter' && task.rule.threshold && (<span>
                          Triggers when {task.rule.threshold.meterId} {task.rule.threshold.operator} {task.rule.threshold.value}
                        </span>)}
                    </div>

                    {task.lastGeneratedAt && (<div className="mt-2 text-sm text-gray-500">
                        Last generated: {(0, utils_1.formatDateTime)(task.lastGeneratedAt)}
                      </div>)}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <button_1.Button variant="outline" size="sm">
                        {task.isActive ? (<>
                            <lucide_react_1.Pause className="w-4 h-4 mr-1"/>
                            Pause
                          </>) : (<>
                            <lucide_react_1.Play className="w-4 h-4 mr-1"/>
                            Activate
                          </>)}
                      </button_1.Button>
                      <button_1.Button variant="outline" size="sm">
                        <lucide_react_1.CheckCircle className="w-4 h-4 mr-1"/>
                        Generate
                      </button_1.Button>
                    </div>
                    {task.nextDueAt && new Date(task.nextDueAt) < new Date() && (<badge_1.Badge className="bg-red-100 text-red-800">
                        Overdue
                      </badge_1.Badge>)}
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>); })}
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="calendar">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Calendar className="w-5 h-5 mr-2"/>
                PM Schedule Calendar
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Calendar view will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="schedule">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Clock className="w-5 h-5 mr-2"/>
                Upcoming Schedule
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Schedule timeline will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>

      {pmTasks.length === 0 && (<card_1.Card>
          <card_1.CardContent className="p-12 text-center">
            <lucide_react_1.Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No PM tasks found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first preventive maintenance task'}
            </p>
            <button_1.Button>
              <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
              New PM Task
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>)}
    </div>);
}
exports.PreventiveMaintenance = PreventiveMaintenance;
