import { CalendarCog, Plus, Search, Clock, Settings, Play, Pause } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function PM() {
  const { colors } = useTheme();

  const pmStats = [
    { label: 'Active Tasks', count: 18, color: colors.success },
    { label: 'Due This Week', count: 5, color: colors.warning },
    { label: 'Overdue', count: 2, color: colors.error },
    { label: 'Completed MTD', count: 42, color: colors.info }
  ];

  const pmTasks = [
    {
      id: '1',
      title: 'Monthly Pump Inspection',
      description: 'Routine inspection and maintenance of pump systems including lubrication and performance checks.',
      asset: 'Pump Station 1',
      frequency: 'Monthly',
      nextDue: 'Tomorrow',
      status: 'Active',
      estimatedHours: 2
    },
    {
      id: '2',
      title: 'Quarterly HVAC Filter Change',
      description: 'Replace air filters and inspect HVAC system components.',
      asset: 'HVAC Unit 3',
      frequency: 'Quarterly',
      nextDue: 'Next Week',
      status: 'Active',
      estimatedHours: 1
    },
    {
      id: '3',
      title: 'Annual Conveyor Overhaul',
      description: 'Complete inspection and maintenance of conveyor system.',
      asset: 'Conveyor Line 2',
      frequency: 'Annually',
      nextDue: 'Next Month',
      status: 'Inactive',
      estimatedHours: 8
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Preventive Maintenance</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Schedule and manage preventive maintenance tasks
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          New PM Task
        </button>
      </div>

      {/* PM Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {pmStats.map((stat, index) => (
          <div 
            key={index}
            className="rounded-xl border p-4 shadow-sm text-center hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</div>
            <div className="text-sm" style={{ color: colors.mutedForeground }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
            style={{ color: colors.mutedForeground }}
          />
          <input
            type="text"
            placeholder="Search PM tasks..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
      </div>

      {/* PM Tasks */}
      <div className="space-y-4">
        {pmTasks.map((task) => (
          <div 
            key={task.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <CalendarCog className="w-5 h-5" style={{ color: colors.primary }} />
                  <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                    {task.title}
                  </h3>
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ 
                      backgroundColor: task.status === 'Active' ? `${colors.success}20` : `${colors.mutedForeground}20`,
                      color: task.status === 'Active' ? colors.success : colors.mutedForeground
                    }}
                  >
                    {task.status}
                  </span>
                </div>
                
                <p className="mb-3" style={{ color: colors.mutedForeground }}>
                  {task.description}
                </p>
                
                <div className="flex items-center gap-6 text-sm" style={{ color: colors.mutedForeground }}>
                  <div className="flex items-center gap-1">
                    <Settings className="w-4 h-4" />
                    Asset: {task.asset}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Frequency: {task.frequency}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Next Due: {task.nextDue}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Est. {task.estimatedHours}h
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button 
                  className="px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                  style={{ borderColor: colors.border, color: colors.foreground }}
                >
                  Edit
                </button>
                <button 
                  className="flex items-center gap-1 px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                  style={{ backgroundColor: colors.primary, color: 'white' }}
                >
                  {task.status === 'Active' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  {task.status === 'Active' ? 'Pause' : 'Activate'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}