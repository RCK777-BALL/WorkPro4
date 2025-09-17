import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: 'blue' | 'red' | 'green' | 'purple' | 'orange';
  trend?: {
    value: number;
    label: string;
  };
  sparklineData?: number[];
}

export function KpiCard({ title, value, icon, color, trend, sparklineData }: KpiCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {sparklineData && (
          <div className="flex items-end space-x-1 h-8">
            {sparklineData.map((value, index) => (
              <div
                key={index}
                className={`w-1 rounded-full ${
                  color === 'blue' ? 'bg-blue-400' :
                  color === 'red' ? 'bg-red-400' :
                  color === 'green' ? 'bg-green-400' :
                  color === 'purple' ? 'bg-purple-400' :
                  'bg-orange-400'
                }`}
                style={{ height: `${Math.max(4, (value / Math.max(...sparklineData)) * 32)}px` }}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        
        {trend && (
          <div className="flex items-center mt-2">
            {trend.value > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm font-medium ${trend.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-gray-500 ml-1">{trend.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}