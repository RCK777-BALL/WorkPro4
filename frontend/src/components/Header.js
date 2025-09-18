"use strict";
exports.__esModule = true;
exports.Header = void 0;
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var button_1 = require("./ui/button");
var input_1 = require("./ui/input");
var badge_1 = require("./ui/badge");
function Header() {
    var _a = (0, react_1.useState)(false), showCommandPalette = _a[0], setShowCommandPalette = _a[1];
    var handleKeyDown = function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            setShowCommandPalette(true);
        }
    };
    return (<header className="gradient-header shadow-lg border-b border-white/20" onKeyDown={handleKeyDown} tabIndex={-1}>
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur rounded-lg p-2">
              <lucide_react_1.Settings className="w-6 h-6 text-white"/>
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold">WorkPro CMMS</h1>
              <p className="text-white/80 text-sm">Acme Manufacturing</p>
            </div>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center space-x-4">
            <div className="relative max-w-md">
              <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60"/>
              <input_1.Input placeholder="Search work orders, assets... (Ctrl+K)" className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20" onClick={function () { return setShowCommandPalette(true); }} readOnly/>
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                <badge_1.Badge variant="secondary" className="bg-white/20 text-white/80 text-xs">
                  <lucide_react_1.Command className="w-3 h-3 mr-1"/>
                  K
                </badge_1.Badge>
              </div>
            </div>

            <button_1.Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
              <lucide_react_1.Bell className="w-5 h-5"/>
            </button_1.Button>

            <div className="flex items-center space-x-2 bg-white/10 rounded-lg px-3 py-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <lucide_react_1.User className="w-4 h-4 text-white"/>
              </div>
              <div className="text-white text-sm">
                <div className="font-medium">John Smith</div>
                <div className="text-white/70">Administrator</div>
              </div>
              <button_1.Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                <lucide_react_1.LogOut className="w-4 h-4"/>
              </button_1.Button>
            </div>
          </div>
        </div>
      </div>
    </header>);
}
exports.Header = Header;
