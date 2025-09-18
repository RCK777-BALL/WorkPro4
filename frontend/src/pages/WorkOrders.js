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
exports.WorkOrders = void 0;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var api_1 = require("@/lib/api");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var badge_1 = require("@/components/ui/badge");
var card_1 = require("@/components/ui/card");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function WorkOrders() {
    var _this = this;
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(''), statusFilter = _b[0], setStatusFilter = _b[1];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['work-orders', { search: search, status: statusFilter }],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            var params, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        params = new URLSearchParams();
                        if (search)
                            params.set('q', search);
                        if (statusFilter)
                            params.set('status', statusFilter);
                        return [4 /*yield*/, api_1.api.get("/work-orders?".concat(params))];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.data];
                }
            });
        }); }
    }), data = _c.data, isLoading = _c.isLoading;
    var statusCounts = (data === null || data === void 0 ? void 0 : data.workOrders.reduce(function (acc, wo) {
        acc[wo.status] = (acc[wo.status] || 0) + 1;
        return acc;
    }, {})) || {};
    if (isLoading) {
        return (<div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map(function (_, i) { return (<div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>); })}
        </div>
      </div>);
    }
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-gray-500">Manage and track maintenance work orders</p>
        </div>
        <button_1.Button className="flex items-center">
          <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
          New Work Order
        </button_1.Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {['requested', 'approved', 'assigned', 'in_progress', 'completed', 'cancelled'].map(function (status) { return (<card_1.Card key={status} className={"cursor-pointer transition-all ".concat(statusFilter === status ? 'ring-2 ring-primary' : 'hover:shadow-md')} onClick={function () { return setStatusFilter(statusFilter === status ? '' : status); }}>
            <card_1.CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
              <div className="text-sm text-gray-500 capitalize">
                {status.replace('_', ' ')}
              </div>
            </card_1.CardContent>
          </card_1.Card>); })}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input_1.Input placeholder="Search work orders..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="pl-10"/>
        </div>
        <button_1.Button variant="outline" className="flex items-center">
          <lucide_react_1.Filter className="w-4 h-4 mr-2"/>
          Filters
        </button_1.Button>
      </div>

      {/* Work Orders List */}
      <div className="space-y-4">
        {data === null || data === void 0 ? void 0 : data.workOrders.map(function (workOrder) { return (<card_1.Card key={workOrder.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <card_1.CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {workOrder.title}
                    </h3>
                    <badge_1.Badge className={(0, utils_1.getStatusColor)(workOrder.status)}>
                      {workOrder.status.replace('_', ' ')}
                    </badge_1.Badge>
                    <badge_1.Badge className={(0, utils_1.getPriorityColor)(workOrder.priority)}>
                      {workOrder.priority}
                    </badge_1.Badge>
                  </div>
                  
                  {workOrder.description && (<p className="text-gray-600 mb-3 line-clamp-2">
                      {workOrder.description}
                    </p>)}

                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    {workOrder.assetName && (<div className="flex items-center">
                        <lucide_react_1.Wrench className="w-4 h-4 mr-1"/>
                        {workOrder.assetName}
                      </div>)}
                    <div className="flex items-center">
                      <lucide_react_1.User className="w-4 h-4 mr-1"/>
                      {workOrder.requestedByName}
                    </div>
                    <div className="flex items-center">
                      <lucide_react_1.Calendar className="w-4 h-4 mr-1"/>
                      {(0, utils_1.formatDate)(workOrder.createdAt)}
                    </div>
                    {workOrder.dueDate && (<div className="flex items-center text-orange-600">
                        <lucide_react_1.Calendar className="w-4 h-4 mr-1"/>
                        Due: {(0, utils_1.formatDate)(workOrder.dueDate)}
                      </div>)}
                  </div>

                  {workOrder.assigneeNames.length > 0 && (<div className="mt-2">
                      <div className="text-sm text-gray-500">
                        Assigned to: {workOrder.assigneeNames.join(', ')}
                      </div>
                    </div>)}
                </div>

                <div className="flex flex-col items-end space-y-2">
                  {workOrder.completedAt && (<div className="text-sm text-green-600 font-medium">
                      Completed {(0, utils_1.formatDate)(workOrder.completedAt)}
                    </div>)}
                  {workOrder.actualHours && (<div className="text-sm text-gray-500">
                      {workOrder.actualHours}h logged
                    </div>)}
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>); })}
      </div>

      {(!(data === null || data === void 0 ? void 0 : data.workOrders) || data.workOrders.length === 0) && (<card_1.Card>
          <card_1.CardContent className="p-12 text-center">
            <lucide_react_1.Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No work orders found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first work order'}
            </p>
            <button_1.Button>
              <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
              New Work Order
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>)}
    </div>);
}
exports.WorkOrders = WorkOrders;
