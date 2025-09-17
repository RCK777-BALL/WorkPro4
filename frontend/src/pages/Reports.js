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
exports.Reports = void 0;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var lucide_react_1 = require("lucide-react");
function Reports() {
    var _this = this;
    var _a = (0, react_1.useState)('30d'), dateRange = _a[0], setDateRange = _a[1];
    // Mock report data
    var mockReportData = {
        workOrderMetrics: {
            totalCompleted: 145,
            avgCompletionTime: 4.2,
            onTimeCompletion: 87,
            overdueCount: 12
        },
        assetMetrics: {
            totalAssets: 234,
            uptime: 94.5,
            mtbf: 720,
            mttr: 3.8
        },
        inventoryMetrics: {
            totalParts: 1250,
            stockValue: 125000,
            lowStockItems: 23,
            turnoverRate: 4.2
        },
        costMetrics: {
            maintenanceCosts: 45000,
            laborCosts: 28000,
            partsCosts: 17000,
            budgetVariance: -5.2
        }
    };
    var _b = (0, react_query_1.useQuery)({
        queryKey: ['reports', dateRange],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Mock API call - replace with actual implementation
                return [2 /*return*/, mockReportData];
            });
        }); }
    }), _c = _b.data, reportData = _c === void 0 ? mockReportData : _c, isLoading = _b.isLoading;
    var reports = [
        {
            id: 'work-order-summary',
            name: 'Work Order Summary',
            description: 'Comprehensive work order performance metrics',
            icon: lucide_react_1.Wrench,
            category: 'Operations'
        },
        {
            id: 'asset-performance',
            name: 'Asset Performance',
            description: 'Asset uptime, reliability, and maintenance metrics',
            icon: lucide_react_1.Building2,
            category: 'Assets'
        },
        {
            id: 'inventory-analysis',
            name: 'Inventory Analysis',
            description: 'Stock levels, usage patterns, and cost analysis',
            icon: lucide_react_1.Package,
            category: 'Inventory'
        },
        {
            id: 'maintenance-costs',
            name: 'Maintenance Costs',
            description: 'Cost breakdown and budget variance analysis',
            icon: lucide_react_1.BarChart3,
            category: 'Financial'
        },
    ];
    if (isLoading) {
        return (<div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4">
          {Array.from({ length: 4 }).map(function (_, i) { return (<div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>); })}
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500">Comprehensive insights into your maintenance operations</p>
        </div>
        <div className="flex space-x-2">
          <button_1.Button variant="outline" className="flex items-center">
            <lucide_react_1.Calendar className="w-4 h-4 mr-2"/>
            Last 30 Days
          </button_1.Button>
          <button_1.Button variant="outline" className="flex items-center">
            <lucide_react_1.Download className="w-4 h-4 mr-2"/>
            Export
          </button_1.Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <card_1.Card>
          <card_1.CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Work Orders Completed</p>
                <p className="text-3xl font-bold">{reportData.workOrderMetrics.totalCompleted}</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <lucide_react_1.TrendingUp className="w-4 h-4 mr-1"/>
                  +12% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <lucide_react_1.Wrench className="w-6 h-6 text-blue-600"/>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Asset Uptime</p>
                <p className="text-3xl font-bold">{reportData.assetMetrics.uptime}%</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <lucide_react_1.TrendingUp className="w-4 h-4 mr-1"/>
                  +2.1% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <lucide_react_1.Building2 className="w-6 h-6 text-green-600"/>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Completion Time</p>
                <p className="text-3xl font-bold">{reportData.workOrderMetrics.avgCompletionTime}h</p>
                <p className="text-sm text-red-600 flex items-center mt-1">
                  <lucide_react_1.TrendingUp className="w-4 h-4 mr-1 rotate-180"/>
                  +0.3h vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <lucide_react_1.Clock className="w-6 h-6 text-orange-600"/>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card>
          <card_1.CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Inventory Value</p>
                <p className="text-3xl font-bold">${(reportData.inventoryMetrics.stockValue / 1000).toFixed(0)}K</p>
                <p className="text-sm text-green-600 flex items-center mt-1">
                  <lucide_react_1.TrendingUp className="w-4 h-4 mr-1"/>
                  +5.2% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <lucide_react_1.Package className="w-6 h-6 text-purple-600"/>
              </div>
            </div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      <tabs_1.Tabs defaultValue="overview" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="overview">Overview</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="operations">Operations</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="assets">Assets</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="financial">Financial</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Work Order Performance</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">On-Time Completion</span>
                    <span className="font-medium">{reportData.workOrderMetrics.onTimeCompletion}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "".concat(reportData.workOrderMetrics.onTimeCompletion, "%") }}/>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overdue Work Orders</span>
                    <span className="font-medium text-red-600">{reportData.workOrderMetrics.overdueCount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Completion Time</span>
                    <span className="font-medium">{reportData.workOrderMetrics.avgCompletionTime} hours</span>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>Asset Reliability</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Overall Uptime</span>
                    <span className="font-medium">{reportData.assetMetrics.uptime}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: "".concat(reportData.assetMetrics.uptime, "%") }}/>
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
              </card_1.CardContent>
            </card_1.Card>
          </div>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Available Reports</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map(function (report) { return (<div key={report.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <report.icon className="w-5 h-5 text-gray-600"/>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{report.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {report.category}
                          </span>
                          <button_1.Button variant="outline" size="sm">
                            <lucide_react_1.Download className="w-4 h-4 mr-1"/>
                            Generate
                          </button_1.Button>
                        </div>
                      </div>
                    </div>
                  </div>); })}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="operations">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Operations Reports</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Detailed operations reports will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="assets">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Asset Reports</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Asset performance and reliability reports will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="financial">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Financial Reports</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Cost analysis and budget reports will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>
    </div>);
}
exports.Reports = Reports;
