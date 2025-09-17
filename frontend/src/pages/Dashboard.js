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
exports.Dashboard = void 0;
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("@/lib/api");
var KpiCard_1 = require("@/components/KpiCard");
var card_1 = require("@/components/ui/card");
var badge_1 = require("@/components/ui/badge");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function Dashboard() {
    var _this = this;
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    var summary = (0, react_query_1.useQuery)({
        queryKey: ['dashboard', 'summary'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, api_1.api.get('/dashboard/summary')];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data];
                }
            });
        }); }
    }).data;
    var trends = (0, react_query_1.useQuery)({
        queryKey: ['dashboard', 'trends'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, api_1.api.get('/dashboard/trends')];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data];
                }
            });
        }); }
    }).data;
    var activity = (0, react_query_1.useQuery)({
        queryKey: ['dashboard', 'activity'],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, api_1.api.get('/dashboard/activity')];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data];
                }
            });
        }); }
    }).data;
    var sparklineData = (trends === null || trends === void 0 ? void 0 : trends.slice(-7).map(function (t) { return t.workOrdersCompleted; })) || [];
    return (<div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here's what's happening with your maintenance operations.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard_1.KpiCard title="Open Work Orders" value={((_a = summary === null || summary === void 0 ? void 0 : summary.workOrders) === null || _a === void 0 ? void 0 : _a.open) || 0} icon={<lucide_react_1.Wrench className="w-6 h-6"/>} color="blue" sparklineData={sparklineData}/>
        <KpiCard_1.KpiCard title="Overdue" value={((_b = summary === null || summary === void 0 ? void 0 : summary.workOrders) === null || _b === void 0 ? void 0 : _b.overdue) || 0} icon={<lucide_react_1.AlertTriangle className="w-6 h-6"/>} color="red" trend={{
            value: -12,
            label: 'vs last month'
        }}/>
        <KpiCard_1.KpiCard title="Completed This Month" value={((_c = summary === null || summary === void 0 ? void 0 : summary.workOrders) === null || _c === void 0 ? void 0 : _c.completedThisMonth) || 0} icon={<lucide_react_1.CheckCircle className="w-6 h-6"/>} color="green" trend={{
            value: ((_d = summary === null || summary === void 0 ? void 0 : summary.workOrders) === null || _d === void 0 ? void 0 : _d.completedTrend) || 0,
            label: 'vs last month'
        }}/>
        <KpiCard_1.KpiCard title="Asset Uptime" value={"".concat(((_f = (_e = summary === null || summary === void 0 ? void 0 : summary.assets) === null || _e === void 0 ? void 0 : _e.uptime) === null || _f === void 0 ? void 0 : _f.toFixed(1)) || 0, "%")} icon={<lucide_react_1.Building2 className="w-6 h-6"/>} color="purple" trend={{
            value: 2.5,
            label: 'vs last month'
        }}/>
      </div>

      {/* Additional KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard_1.KpiCard title="Total Assets" value={((_g = summary === null || summary === void 0 ? void 0 : summary.assets) === null || _g === void 0 ? void 0 : _g.total) || 0} icon={<lucide_react_1.Building2 className="w-6 h-6"/>} color="blue"/>
        <KpiCard_1.KpiCard title="Assets Down" value={((_h = summary === null || summary === void 0 ? void 0 : summary.assets) === null || _h === void 0 ? void 0 : _h.down) || 0} icon={<lucide_react_1.AlertTriangle className="w-6 h-6"/>} color="orange"/>
        <KpiCard_1.KpiCard title="Parts Inventory" value={((_j = summary === null || summary === void 0 ? void 0 : summary.inventory) === null || _j === void 0 ? void 0 : _j.totalParts) || 0} icon={<lucide_react_1.Package className="w-6 h-6"/>} color="green"/>
        <KpiCard_1.KpiCard title="Stock Health" value={"".concat(((_l = (_k = summary === null || summary === void 0 ? void 0 : summary.inventory) === null || _k === void 0 ? void 0 : _k.stockHealth) === null || _l === void 0 ? void 0 : _l.toFixed(1)) || 0, "%")} icon={<lucide_react_1.TrendingUp className="w-6 h-6"/>} color="purple"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <card_1.Card className="lg:col-span-2">
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center">
              <lucide_react_1.Clock className="w-5 h-5 mr-2"/>
              Recent Activity
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="space-y-4">
              {activity === null || activity === void 0 ? void 0 : activity.slice(0, 10).map(function (item) { return (<div key={item.id} className="flex items-start space-x-3 py-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{item.userName}</span>
                      <span className="text-gray-500">{item.action}</span>
                      <badge_1.Badge variant="outline" className="text-xs">
                        {item.entityType.replace('_', ' ')}
                      </badge_1.Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.entityName || "".concat(item.entityType, " ").concat(item.entityId.slice(0, 8))}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {(0, utils_1.formatDateTime)(item.createdAt)}
                    </p>
                  </div>
                </div>); })}
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>Quick Stats</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Work Orders Today</span>
                <span className="font-medium">
                  {((_m = trends === null || trends === void 0 ? void 0 : trends.slice(-1)[0]) === null || _m === void 0 ? void 0 : _m.workOrdersCreated) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Today</span>
                <span className="font-medium text-green-600">
                  {((_o = trends === null || trends === void 0 ? void 0 : trends.slice(-1)[0]) === null || _o === void 0 ? void 0 : _o.workOrdersCompleted) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Assets Operational</span>
                <span className="font-medium text-green-600">
                  {((_p = summary === null || summary === void 0 ? void 0 : summary.assets) === null || _p === void 0 ? void 0 : _p.operational) || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Low Stock Items</span>
                <span className="font-medium text-orange-600">
                  {((_q = summary === null || summary === void 0 ? void 0 : summary.inventory) === null || _q === void 0 ? void 0 : _q.lowStock) || 0}
                </span>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>System Status</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Status</span>
                  <badge_1.Badge className="bg-green-100 text-green-800">Online</badge_1.Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database</span>
                  <badge_1.Badge className="bg-green-100 text-green-800">Healthy</badge_1.Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Last Backup</span>
                  <span className="text-sm text-gray-500">2 hours ago</span>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>
      </div>
    </div>);
}
exports.Dashboard = Dashboard;
