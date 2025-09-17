"use strict";
exports.__esModule = true;
exports.Layout = void 0;
var react_router_dom_1 = require("react-router-dom");
var Header_1 = require("./Header");
var Sidebar_1 = require("./Sidebar");
function Layout(_a) {
    var children = _a.children;
    return (<div className="min-h-screen bg-gray-50">
      <Header_1.Header />
      <div className="flex">
        <Sidebar_1.Sidebar />
        <main className="flex-1 p-6">
          {children || <react_router_dom_1.Outlet />}
        </main>
      </div>
    </div>);
}
exports.Layout = Layout;
