import { TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent } from './ui/card';
import { cn } from '@/lib/utils';

const colorClasses = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  orange: 'bg-orange-500 text-white',
  red: 'bg-red-500 text-white',
  purple: 'bg-purple-500 text-white',
};

export function KpiCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  sparklineData = [],
}) {
  const trendColor = trend && trend.value > 0 ? 'text-green-600' : 'text-red-600';
  const TrendIcon = trend && trend.value > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <div className={cn('flex items-center text-sm mt-2', trendColor)}>
                <TrendIcon className="w-4 h-4 mr-1" />
                <span className="font-medium">{Math.abs(trend.value)}%</span>
                <span className="text-muted-foreground ml-1">{trend.label}</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              'w-12 h-12 rounded-lg flex items-center justify-center',
              colorClasses[color],
            )}
          >
            {icon}
          </div>
        </div>

        {sparklineData.length > 0 && (
          <div className="mt-4">
            <div className="sparkline-container">
              <svg width="100%" height="100%" className="text-gray-400">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  points={sparklineData
                    .map((value, index) => {
                      const x = (index / (sparklineData.length - 1)) * 60;
                      const y = 30 - (value / Math.max(...sparklineData)) * 20;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              </svg>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
