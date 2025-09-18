import { BarChart3, Plus, Search, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Analytics() {
  const { colors } = useTheme();

  const analyticsStats = [
    { 
      label: 'Work Order Completion Rate', 
      value: '94%', 
      change: '+3%', 
      changeType: 'positive',
      color: colors.success 
    },
    { 
      label: 'Average Response Time', 
      value: '2.4h', 
      change: '-0.3h', 
      changeType: 'positive',
      color: colors.primary 
    },
    { 
      label: 'Asset Uptime', 
      value: '96.8%', 
      change: '+1.2%', 
      changeType: 'positive',
      color: colors.info 
    },
    { 
      label: 'Maintenance Costs', 
      value: '$45K', 
      change: '+$2K', 
      changeType: 'negative',
      color: colors.warning 
    }
  ];

  const reports = [
    {
      id: '1',
      name: 'Work Order Performance',
      description: 'Comprehensive analysis of work order completion rates, response times, and efficiency metrics.',
      category: 'Operations',
      lastGenerated: '2 hours ago',
      frequency: 'Daily',
      status: 'Ready'
    },
    {
      id: '2',
      name: 'Asset Reliability Report',
      description: 'Asset uptime, failure rates, and maintenance history analysis.',
      category: 'Assets',
      lastGenerated: '1 day ago',
      frequency: 'Weekly',
      status: 'Ready'
    },
    {
      id: '3',
      name: 'Cost Analysis Dashboard',
      description: 'Maintenance spending breakdown, budget variance, and cost optimization opportunities.',
      category: 'Financial',
      lastGenerated: '3 days ago',
      frequency: 'Monthly',
      status: 'Generating'
    }
  ];

  const kpiTrends = [
    {
      name: 'Work Orders Completed',
      current: 156,
      previous: 142,
      trend: 'up',
      percentage: 9.9
    },
    {
      name: 'Average Resolution Time',
      current: 4.2,
      previous: 4.8,
      trend: 'down',
      percentage: 12.5,
      unit: 'hours'
    },
    {
      name: 'Preventive Maintenance Compliance',
      current: 87,
      previous: 82,
      trend: 'up',
      percentage: 6.1,
      unit: '%'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Ready': return colors.success;
      case 'Generating': return colors.warning;
      case 'Error': return colors.error;
      default: return colors.mutedForeground;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Analytics</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Maintenance performance insights and reports
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          New Report
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {analyticsStats.map((stat, index) => (
          <div 
            key={index}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${stat.color}20` }}
              >
                <BarChart3 className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <span 
                className="flex items-center gap-1 text-sm"
                style={{ 
                  color: stat.changeType === 'positive' ? colors.success : colors.error
                }}
              >
                {stat.changeType === 'positive' ? 
                  <TrendingUp className="w-4 h-4" /> : 
                  <TrendingDown className="w-4 h-4" />
                }
                {stat.change}
              </span>
            </div>
            <h3 className="text-sm mb-1" style={{ color: colors.mutedForeground }}>{stat.label}</h3>
            <p className="text-2xl font-bold" style={{ color: colors.foreground }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* KPI Trends */}
      <div 
        className="rounded-xl border p-6 shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>Performance Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {kpiTrends.map((kpi, index) => (
            <div key={index} className="text-center">
              <div className="flex items-center justify-center mb-2">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: kpi.trend === 'up' ? `${colors.success}20` : `${colors.error}20`
                  }}
                >
                  {kpi.trend === 'up' ? 
                    <TrendingUp className="w-5 h-5" style={{ color: colors.success }} /> :
                    <TrendingDown className="w-5 h-5" style={{ color: colors.error }} />
                  }
                </div>
              </div>
              <h4 className="text-sm mb-1" style={{ color: colors.mutedForeground }}>{kpi.name}</h4>
              <p className="text-xl font-bold mb-1" style={{ color: colors.foreground }}>
                {kpi.current}{kpi.unit || ''}
              </p>
              <p 
                className="text-sm"
                style={{ 
                  color: kpi.trend === 'up' ? colors.success : colors.error
                }}
              >
                {kpi.trend === 'up' ? '+' : '-'}{kpi.percentage}% vs last period
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Reports Section */}
      <div 
        className="rounded-xl border p-6 shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>Available Reports</h3>
          <div className="relative">
            <Search 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
              style={{ color: colors.mutedForeground }}
            />
            <input
              type="text"
              placeholder="Search reports..."
              className="w-64 h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ 
                backgroundColor: colors.background, 
                borderColor: colors.border,
                color: colors.foreground
              }}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          {reports.map((report) => (
            <div 
              key={report.id}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-opacity-80 transition-colors"
              style={{ backgroundColor: `${colors.muted}40` }}
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${colors.primary}20` }}
                >
                  <Activity className="w-5 h-5" style={{ color: colors.primary }} />
                </div>
                <div>
                  <h4 className="font-medium mb-1" style={{ color: colors.foreground }}>{report.name}</h4>
                  <p className="text-sm mb-2" style={{ color: colors.mutedForeground }}>{report.description}</p>
                  <div className="flex items-center gap-4 text-sm" style={{ color: colors.mutedForeground }}>
                    <span>Category: {report.category}</span>
                    <span>Frequency: {report.frequency}</span>
                    <span>Last generated: {report.lastGenerated}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span 
                  className="px-2 py-1 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${getStatusColor(report.status)}20`,
                    color: getStatusColor(report.status)
                  }}
                >
                  {report.status}
                </span>
                <button 
                  className="flex items-center gap-1 px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                >
                  <Target className="w-4 h-4" />
                  Generate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}