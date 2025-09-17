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
exports.Purchasing = void 0;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var badge_1 = require("@/components/ui/badge");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function Purchasing() {
    var _this = this;
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(''), statusFilter = _b[0], setStatusFilter = _b[1];
    // Mock data for purchase orders
    var mockPurchaseOrders = [
        {
            id: '1',
            poNumber: 'PO-2024-001',
            vendorName: 'Industrial Supply Co.',
            status: 'approved',
            subtotal: 1250.00,
            tax: 100.00,
            shipping: 50.00,
            total: 1400.00,
            orderedAt: '2024-01-15T10:00:00Z',
            receivedAt: null,
            lines: [
                { partName: 'Pump Seal Kit', partSku: 'PUMP-SEAL-001', quantity: 10, unitCost: 45.50 },
                { partName: 'Bearing Set', partSku: 'BEAR-001', quantity: 5, unitCost: 125.00 },
            ]
        },
        {
            id: '2',
            poNumber: 'PO-2024-002',
            vendorName: 'Belt & Drive Solutions',
            status: 'received',
            subtotal: 850.00,
            tax: 68.00,
            shipping: 25.00,
            total: 943.00,
            orderedAt: '2024-01-10T14:30:00Z',
            receivedAt: '2024-01-18T09:15:00Z',
            lines: [
                { partName: 'V-Belt 4L360', partSku: 'BELT-V-002', quantity: 25, unitCost: 12.75 },
                { partName: 'Timing Belt', partSku: 'BELT-T-003', quantity: 10, unitCost: 32.50 },
            ]
        },
        {
            id: '3',
            poNumber: 'PO-2024-003',
            vendorName: 'Lubricant Specialists',
            status: 'draft',
            subtotal: 495.00,
            tax: 39.60,
            shipping: 15.00,
            total: 549.60,
            orderedAt: null,
            receivedAt: null,
            lines: [
                { partName: 'Hydraulic Oil ISO 46', partSku: 'OIL-HYD-003', quantity: 60, unitCost: 8.25 },
            ]
        },
    ];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['purchase-orders', { search: search, status: statusFilter }],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, mockPurchaseOrders.filter(function (po) {
                        var matchesSearch = !search ||
                            po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
                            po.vendorName.toLowerCase().includes(search.toLowerCase());
                        var matchesStatus = !statusFilter || po.status === statusFilter;
                        return matchesSearch && matchesStatus;
                    })];
            });
        }); }
    }), _d = _c.data, purchaseOrders = _d === void 0 ? mockPurchaseOrders : _d, isLoading = _c.isLoading;
    var statusCounts = purchaseOrders.reduce(function (acc, po) {
        acc[po.status] = (acc[po.status] || 0) + 1;
        return acc;
    }, {});
    var totalValue = purchaseOrders.reduce(function (sum, po) { return sum + po.total; }, 0);
    var pendingValue = purchaseOrders
        .filter(function (po) { return ['draft', 'submitted', 'approved'].includes(po.status); })
        .reduce(function (sum, po) { return sum + po.total; }, 0);
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
          <h1 className="text-3xl font-bold text-gray-900">Purchasing</h1>
          <p className="text-gray-500">Manage purchase orders and vendor relationships</p>
        </div>
        <button_1.Button className="flex items-center">
          <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
          New Purchase Order
        </button_1.Button>
      </div>

      {/* Purchase Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{purchaseOrders.length}</div>
            <div className="text-sm text-gray-500">Total POs</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{statusCounts.approved || 0}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{(0, utils_1.formatCurrency)(totalValue)}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{(0, utils_1.formatCurrency)(pendingValue)}</div>
            <div className="text-sm text-gray-500">Pending Value</div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Status Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input_1.Input placeholder="Search purchase orders..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="pl-10"/>
        </div>
        <div className="flex space-x-2">
          {['draft', 'submitted', 'approved', 'ordered', 'received'].map(function (status) { return (<button_1.Button key={status} variant={statusFilter === status ? 'default' : 'outline'} size="sm" onClick={function () { return setStatusFilter(statusFilter === status ? '' : status); }}>
              {status} ({statusCounts[status] || 0})
            </button_1.Button>); })}
        </div>
      </div>

      <tabs_1.Tabs defaultValue="orders" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="orders">Purchase Orders</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="requests">Purchase Requests</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="vendors">Vendors</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="orders" className="space-y-4">
          {purchaseOrders.map(function (po) { return (<card_1.Card key={po.id} className="hover:shadow-md transition-shadow">
              <card_1.CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {po.poNumber}
                      </h3>
                      <badge_1.Badge className={(0, utils_1.getStatusColor)(po.status)}>
                        {po.status}
                      </badge_1.Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">
                      {po.vendorName}
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                      <div>
                        <span className="text-gray-500">Subtotal:</span>
                        <div className="font-medium">{(0, utils_1.formatCurrency)(po.subtotal)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Tax:</span>
                        <div className="font-medium">{(0, utils_1.formatCurrency)(po.tax)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Shipping:</span>
                        <div className="font-medium">{(0, utils_1.formatCurrency)(po.shipping)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <div className="font-medium text-lg">{(0, utils_1.formatCurrency)(po.total)}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-gray-700">Line Items:</div>
                      {po.lines.map(function (line, index) { return (<div key={index} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                          <div>
                            <span className="font-medium">{line.partName}</span>
                            <span className="text-gray-500 ml-2">({line.partSku})</span>
                          </div>
                          <div className="text-right">
                            <div>{line.quantity} × {(0, utils_1.formatCurrency)(line.unitCost)}</div>
                            <div className="font-medium">{(0, utils_1.formatCurrency)(line.quantity * line.unitCost)}</div>
                          </div>
                        </div>); })}
                    </div>

                    <div className="mt-4 flex items-center space-x-6 text-sm text-gray-500">
                      {po.orderedAt && (<div className="flex items-center">
                          <lucide_react_1.Clock className="w-4 h-4 mr-1"/>
                          Ordered: {(0, utils_1.formatDate)(po.orderedAt)}
                        </div>)}
                      {po.receivedAt && (<div className="flex items-center">
                          <lucide_react_1.CheckCircle className="w-4 h-4 mr-1"/>
                          Received: {(0, utils_1.formatDate)(po.receivedAt)}
                        </div>)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      {po.status === 'draft' && (<button_1.Button variant="outline" size="sm">
                          <lucide_react_1.FileText className="w-4 h-4 mr-1"/>
                          Submit
                        </button_1.Button>)}
                      {po.status === 'approved' && (<button_1.Button variant="outline" size="sm">
                          <lucide_react_1.ShoppingCart className="w-4 h-4 mr-1"/>
                          Order
                        </button_1.Button>)}
                      {po.status === 'ordered' && (<button_1.Button variant="outline" size="sm">
                          <lucide_react_1.Truck className="w-4 h-4 mr-1"/>
                          Receive
                        </button_1.Button>)}
                    </div>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>); })}
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="requests">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.FileText className="w-5 h-5 mr-2"/>
                Purchase Requests
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Purchase request management will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="vendors">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.DollarSign className="w-5 h-5 mr-2"/>
                Vendor Management
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Vendor management will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>

      {purchaseOrders.length === 0 && (<card_1.Card>
          <card_1.CardContent className="p-12 text-center">
            <lucide_react_1.ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by creating your first purchase order'}
            </p>
            <button_1.Button>
              <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
              New Purchase Order
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>)}
    </div>);
}
exports.Purchasing = Purchasing;
