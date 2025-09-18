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
exports.Assets = void 0;
var react_1 = require("react");
var react_query_1 = require("@tanstack/react-query");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var badge_1 = require("@/components/ui/badge");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var lucide_react_1 = require("lucide-react");
var utils_1 = require("@/lib/utils");
function Assets() {
    var _this = this;
    var _a = (0, react_1.useState)(''), search = _a[0], setSearch = _a[1];
    var _b = (0, react_1.useState)(''), statusFilter = _b[0], setStatusFilter = _b[1];
    var _c = (0, react_1.useState)(''), typeFilter = _c[0], setTypeFilter = _c[1];
    // Mock data for now - replace with actual API call
    var mockAssets = [
        {
            id: '1',
            tag: 'PUMP-001',
            name: 'Main Water Pump',
            description: 'Primary water circulation pump for cooling system',
            status: 'operational',
            type: 'equipment',
            location: 'Building A - Mechanical Room',
            purchasedDate: '2023-01-15',
            warrantyExpires: '2025-01-15',
            purchaseCost: 15000,
            qrCodeUrl: '/qr/asset-1.png'
        },
        {
            id: '2',
            tag: 'CONV-002',
            name: 'Production Line Conveyor',
            status: 'maintenance',
            type: 'equipment',
            location: 'Building B - Production Floor',
            purchasedDate: '2022-06-10',
            warrantyExpires: '2024-06-10',
            purchaseCost: 25000
        },
        {
            id: '3',
            tag: 'HVAC-003',
            name: 'HVAC Unit #3',
            status: 'down',
            type: 'equipment',
            location: 'Building A - Roof',
            purchasedDate: '2021-03-20',
            warrantyExpires: '2024-03-20',
            purchaseCost: 8000
        },
    ];
    var _d = (0, react_query_1.useQuery)({
        queryKey: ['assets', { search: search, status: statusFilter, type: typeFilter }],
        queryFn: function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Mock API call - replace with actual implementation
                return [2 /*return*/, mockAssets.filter(function (asset) {
                        var matchesSearch = !search ||
                            asset.name.toLowerCase().includes(search.toLowerCase()) ||
                            asset.tag.toLowerCase().includes(search.toLowerCase());
                        var matchesStatus = !statusFilter || asset.status === statusFilter;
                        var matchesType = !typeFilter || asset.type === typeFilter;
                        return matchesSearch && matchesStatus && matchesType;
                    })];
            });
        }); }
    }), _e = _d.data, assets = _e === void 0 ? mockAssets : _e, isLoading = _d.isLoading;
    var statusCounts = assets.reduce(function (acc, asset) {
        acc[asset.status] = (acc[asset.status] || 0) + 1;
        return acc;
    }, {});
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
          <h1 className="text-3xl font-bold text-gray-900">Assets</h1>
          <p className="text-gray-500">Manage your equipment, facilities, and asset hierarchy</p>
        </div>
        <button_1.Button className="flex items-center">
          <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
          New Asset
        </button_1.Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['operational', 'maintenance', 'down', 'decommissioned'].map(function (status) { return (<card_1.Card key={status} className={"cursor-pointer transition-all ".concat(statusFilter === status ? 'ring-2 ring-primary' : 'hover:shadow-md')} onClick={function () { return setStatusFilter(statusFilter === status ? '' : status); }}>
            <card_1.CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{statusCounts[status] || 0}</div>
              <div className="text-sm text-gray-500 capitalize">
                {status}
              </div>
            </card_1.CardContent>
          </card_1.Card>); })}
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input_1.Input placeholder="Search assets..." value={search} onChange={function (e) { return setSearch(e.target.value); }} className="pl-10"/>
        </div>
        <button_1.Button variant="outline" className="flex items-center">
          <lucide_react_1.Filter className="w-4 h-4 mr-2"/>
          Filters
        </button_1.Button>
      </div>

      <tabs_1.Tabs defaultValue="list" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="list">List View</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="tree">Tree View</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="map">Map View</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="list" className="space-y-4">
          {assets.map(function (asset) { return (<card_1.Card key={asset.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <card_1.CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {asset.name}
                      </h3>
                      <badge_1.Badge variant="outline" className="font-mono text-xs">
                        {asset.tag}
                      </badge_1.Badge>
                      <badge_1.Badge className={(0, utils_1.getStatusColor)(asset.status)}>
                        {asset.status}
                      </badge_1.Badge>
                    </div>
                    
                    {asset.description && (<p className="text-gray-600 mb-3">
                        {asset.description}
                      </p>)}

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <lucide_react_1.MapPin className="w-4 h-4 mr-1"/>
                        {asset.location}
                      </div>
                      <div className="flex items-center">
                        <lucide_react_1.Calendar className="w-4 h-4 mr-1"/>
                        Purchased: {(0, utils_1.formatDate)(asset.purchasedDate)}
                      </div>
                      {asset.purchaseCost && (<div className="flex items-center">
                          <lucide_react_1.DollarSign className="w-4 h-4 mr-1"/>
                          ${asset.purchaseCost.toLocaleString()}
                        </div>)}
                    </div>

                    {asset.warrantyExpires && (<div className="mt-2 text-sm">
                        <span className="text-gray-500">Warranty expires: </span>
                        <span className={new Date(asset.warrantyExpires) < new Date() ? 'text-red-600' : 'text-green-600'}>
                          {(0, utils_1.formatDate)(asset.warrantyExpires)}
                        </span>
                      </div>)}
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <button_1.Button variant="outline" size="sm">
                        <lucide_react_1.Wrench className="w-4 h-4 mr-1"/>
                        Work Order
                      </button_1.Button>
                      {asset.qrCodeUrl && (<button_1.Button variant="outline" size="sm">
                          <lucide_react_1.QrCode className="w-4 h-4"/>
                        </button_1.Button>)}
                    </div>
                  </div>
                </div>
              </card_1.CardContent>
            </card_1.Card>); })}
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="tree">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Building2 className="w-5 h-5 mr-2"/>
                Asset Hierarchy
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-4">
                <div className="text-center text-gray-500 py-12">
                  Asset tree view will be implemented here
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="map">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.MapPin className="w-5 h-5 mr-2"/>
                Asset Locations
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Interactive map view will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>

      {assets.length === 0 && (<card_1.Card>
          <card_1.CardContent className="p-12 text-center">
            <lucide_react_1.Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4"/>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-500 mb-6">
              {search || statusFilter || typeFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first asset'}
            </p>
            <button_1.Button>
              <lucide_react_1.Plus className="w-4 h-4 mr-2"/>
              New Asset
            </button_1.Button>
          </card_1.CardContent>
        </card_1.Card>)}
    </div>);
}
exports.Assets = Assets;
