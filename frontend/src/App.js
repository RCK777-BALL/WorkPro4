"use strict";
exports.__esModule = true;
var react_router_dom_1 = require("react-router-dom");
var react_query_1 = require("@tanstack/react-query");
var Layout_1 = require("./components/Layout");
var Dashboard_1 = require("./pages/Dashboard");
var WorkOrders_1 = require("./pages/WorkOrders");
var Assets_1 = require("./pages/Assets");
var PreventiveMaintenance_1 = require("./pages/PreventiveMaintenance");
var Inventory_1 = require("./pages/Inventory");
var Purchasing_1 = require("./pages/Purchasing");
var Reports_1 = require("./pages/Reports");
var Settings_1 = require("./pages/Settings");
var queryClient = new react_query_1.QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false
        }
    }
});
function App() {
    return (<react_query_1.QueryClientProvider client={queryClient}>
      <react_router_dom_1.BrowserRouter>
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<Layout_1.Layout />}>
            <react_router_dom_1.Route index element={<Dashboard_1.Dashboard />}/>
            <react_router_dom_1.Route path="work-orders" element={<WorkOrders_1.WorkOrders />}/>
            <react_router_dom_1.Route path="pm" element={<PreventiveMaintenance_1.PreventiveMaintenance />}/>
            <react_router_dom_1.Route path="assets" element={<Assets_1.Assets />}/>
            <react_router_dom_1.Route path="inventory" element={<Inventory_1.Inventory />}/>
            <react_router_dom_1.Route path="purchasing" element={<Purchasing_1.Purchasing />}/>
            <react_router_dom_1.Route path="reports" element={<Reports_1.Reports />}/>
            <react_router_dom_1.Route path="settings" element={<Settings_1.Settings />}/>
            <react_router_dom_1.Route path="addons/*" element={<div className="p-8 text-center text-gray-500">Add-ons - Coming Soon</div>}/>
          </react_router_dom_1.Route>
        </react_router_dom_1.Routes>
      </react_router_dom_1.BrowserRouter>
    </react_query_1.QueryClientProvider>);
}
exports["default"] = App;
