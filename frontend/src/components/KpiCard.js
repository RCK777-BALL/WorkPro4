"use strict";
exports.__esModule = true;
exports.KpiCard = void 0;
var card_1 = require("./ui/card");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
function KpiCard(_a) {
    var title = _a.title, value = _a.value, icon = _a.icon, trend = _a.trend, _b = _a.color, color = _b === void 0 ? 'blue' : _b, _c = _a.sparklineData, sparklineData = _c === void 0 ? [] : _c;
    var colorClasses = {
        blue: 'bg-blue-500 text-white',
        green: 'bg-green-500 text-white',
        orange: 'bg-orange-500 text-white',
        red: 'bg-red-500 text-white',
        purple: 'bg-purple-500 text-white'
    };
    var trendColor = trend && trend.value > 0 ? 'text-green-600' : 'text-red-600';
    var TrendIcon = trend && trend.value > 0 ? lucide_react_1.TrendingUp : lucide_react_1.TrendingDown;
    return (<card_1.Card className="transition-all duration-200 hover:shadow-lg">
      <card_1.CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (<div className={(0, utils_1.cn)('flex items-center text-sm mt-2', trendColor)}>
                <TrendIcon className="w-4 h-4 mr-1"/>
                <span className="font-medium">{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground ml-1">{trend.label}</span>
              </div>)}
          </div>
          <div className={(0, utils_1.cn)('w-12 h-12 rounded-lg flex items-center justify-center', colorClasses[color])}>
            {icon}
          </div>
        </div>
        
        {sparklineData.length > 0 && (<div className="mt-4">
            <div className="sparkline-container">
              <svg width="100%" height="100%" className="text-gray-400">
                <polyline fill="none" stroke="currentColor" strokeWidth="1" points={sparklineData.map(function (value, index) {
                return "".concat((index / (sparklineData.length - 1)) * 60, ",").concat(30 - (value / Math.max.apply(Math, sparklineData)) * 20);
            }).join(' ')}/>
              </svg>
            </div>
          </div>)}
      </card_1.CardContent>
    </card_1.Card>);
}
exports.KpiCard = KpiCard;
