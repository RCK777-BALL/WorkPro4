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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
exports.Inventory = void 0;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var badge_1 = require("@/components/ui/badge");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function Inventory() {
    var _this = this;
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(''), categoryFilter = _b[0], setCategoryFilter = _b[1];
    // Mock data for parts
    var mockParts = [
        {
            id: '1',
            sku: 'PUMP-SEAL-001',
            name: 'Pump Seal Kit',
            description: 'Replacement seal kit for centrifugal pumps',
            category: 'Seals & Gaskets',
            unitOfMeasure: 'each',
            onHand: 15,
            reserved: 2,
            available: 13,
            unitCostAvg: 45.50,
            minStock: 5,
            maxStock: 25,
            reorderPoint: 8,
            vendorName: 'Industrial Supply Co.'
        },
        {
            id: '2',
            sku: 'BELT-V-002',
            name: 'V-Belt 4L360',
            description: 'Standard V-belt for motor drives',
            category: 'Belts & Chains',
            unitOfMeasure: 'each',
            onHand: 3,
            reserved: 0,
            available: 3,
            unitCostAvg: 12.75,
            minStock: 10,
            maxStock: 50,
            reorderPoint: 15,
            vendorName: 'Belt & Drive Solutions'
        },
        {
            id: '3',
            sku: 'OIL-HYD-003',
            name: 'Hydraulic Oil ISO 46',
            description: 'Premium hydraulic fluid',
            category: 'Fluids & Lubricants',
            unitOfMeasure: 'gallon',
            onHand: 25,
            reserved: 5,
            available: 20,
            unitCostAvg: 8.25,
            minStock: 15,
            maxStock: 100,
            reorderPoint: 20,
            vendorName: 'Lubricant Specialists'
        },
    ];
    var _c = (0, react_query_1.useQuery)({
        queryKey: ['parts', { search: search, category: categoryFilter }],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, mockParts.filter(function (part) {
                        var matchesSearch = !search ||
                            part.name.toLowerCase().includes(search.toLowerCase()) ||
                            part.sku.toLowerCase().includes(search.toLowerCase());
                        var matchesCategory = !categoryFilter || part.category === categoryFilter;
                        return matchesSearch && matchesCategory;
                    })];
            });
        }); }
    }), _d = _c.data, parts = _d === void 0 ? mockParts : _d, isLoading = _c.isLoading;
    var totalParts = parts.length;
    var lowStockParts = parts.filter(function (part) { return part.available <= part.reorderPoint; }).length;
    var totalValue = parts.reduce(function (sum, part) { return sum + (part.onHand * part.unitCostAvg); }, 0);
    var categories = __spreadArray([], new Set(parts.map(function (part) { return part.category; })), true);
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
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Manage parts, stock levels, and purchasing</p>
        </div>
        <button_1.Button className="flex items-center">
          <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
          New Part
        </button_1.Button>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalParts}</div>
            <div className="text-sm text-gray-500">Total Parts</div>
          </card_1.CardContent>
        </card_1.Card>
        <card_1.Card>
          <card_1.CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{lowStockParts}</div>
            <div className="text-sm text-gray-500">Low Stock</div>
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
            <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
            <div className="text-sm text-gray-500">Categories</div>
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input_1.Input placeholder="Search parts..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="pl-10"/>
        </div>
        <button_1.Button variant="outline" onClick={function () { return setCategoryFilter(''); }} className={categoryFilter === '' ? 'bg-primary text-primary-foreground' : ''}>
          All Categories
        </button_1.Button>
        {categories.slice(0, 3).map(function (category) { return (<button_1.Button key={category} variant="outline" onClick={function () { return setCategoryFilter(categoryFilter === category ? '' : category); }} className={categoryFilter === category ? 'bg-primary text-primary-foreground' : ''}>
            {category}
          </button_1.Button>); })}
      </div>

      <tabs_1.Tabs defaultValue="parts" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="parts">Parts</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="vendors">Vendors</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="transactions">Transactions</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="parts" className="space-y-4">
          {parts.map(function (part) { return (<card_1.Card key={part.id} className="hover:shadow-md transition-shadow">
              <card_1.CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {part.name}
                      </h3>
                      <badge_1.Badge variant="outline" className="font-mono text-xs">
                        {part.sku}
                      </badge_1.Badge>
                      <badge_1.Badge variant="outline">
                        {part.category}
                      </badge_1.Badge>
                      {part.available <= part.reorderPoint && (<badge_1.Badge className="bg-red-100 text-red-800 flex items-center">
                          <lucide_react_1.AlertTriangle className="w-3 h-3 mr-1"/>
                          Low Stock
                        </badge_1.Badge>)}
                    </div>
                    
                    {part.description && (<p className="text-gray-600 mb-3">
                        {part.description}
                      </p>)}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">On Hand:</span>
                        <div className="font-medium">{part.onHand} {part.unitOfMeasure}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Available:</span>
                        <div className="font-medium">{part.available} {part.unitOfMeasure}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Unit Cost:</span>
                        <div className="font-medium">{(0, utils_1.formatCurrency)(part.unitCostAvg)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Value:</span>
                        <div className="font-medium">{(0, utils_1.formatCurrency)(part.onHand * part.unitCostAvg)}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Min: {part.minStock}</span>
                      <span>Max: {part.maxStock}</span>
                      <span>Reorder: {part.reorderPoint}</span>
                      {part.vendorName && (<div className="flex items-center">
                          <lucide_react_1.Building className="w-4 h-4 mr-1"/>
                          {part.vendorName}
                        </div>)}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <button_1.Button variant="outline" size="sm">
                        <lucide_react_1.Package className="w-4 h-4 mr-1"/>
                        Adjust
                      </button_1.Button>
                      <button_1.Button variant="outline" size="sm">
                        <lucide_react_1.TrendingDown className="w-4 h-4 mr-1"/>
                        Issue
                      </button_1.Button>
                      <button_1.Button variant="outline" size="sm">
                        <lucide_react_1.Barcode className="w-4 h-4"/>
                      </button_1.Button>
                    </div>
                    
                    {/* Stock level indicator */}
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className={"h-full transition-all ".concat(part.available <= part.reorderPoint
                ? 'bg-red-500'
                : part.available <= part.minStock
                    ? 'bg-yellow-500'
                    : 'bg-green-500')} style={{
                width: "".concat(Math.min((part.available / part.maxStock) * 100, 100), "%")
            }}/>
                    </div>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>); })}
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="vendors">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Building className="w-5 h-5 mr-2"/>
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

        <tabs_1.TabsContent value="transactions">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.DollarSign className="w-5 h-5 mr-2"/>
                Inventory Transactions
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Transaction history will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>

      {parts.length === 0 && (<card_1.Card>
          <card_1.CardContent className="p-12 text-center">
            <lucide_react_1.Package className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
            <p className="text-gray-500 mb-6">
              {search || categoryFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first inventory part'}
            </p>
            <button_1.Button>
              <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
              New Part
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>)}
    </div>);
}
exports.Inventory = Inventory;
