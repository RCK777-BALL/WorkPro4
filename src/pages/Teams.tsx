import { Users, Plus, Search, User, Mail, Phone } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Teams() {
  const { colors } = useTheme();

  const teamStats = [
    { label: 'Total Members', count: 24, color: colors.primary },
    { label: 'Active Today', count: 18, color: colors.success },
    { label: 'On Leave', count: 3, color: colors.warning },
    { label: 'Available', count: 15, color: colors.info }
  ];

  const teamMembers = [
    {
      id: '1',
      name: 'John Smith',
      role: 'Senior Technician',
      email: 'john.smith@workpro3.com',
      phone: '+1 (555) 123-4567',
      status: 'Available',
      skills: ['Electrical', 'HVAC', 'Plumbing'],
      activeWorkOrders: 3
    },
    {
      id: '2',
      name: 'Jane Doe',
      role: 'Maintenance Planner',
      email: 'jane.doe@workpro3.com',
      phone: '+1 (555) 234-5678',
      status: 'Busy',
      skills: ['Planning', 'Scheduling', 'Procurement'],
      activeWorkOrders: 5
    },
    {
      id: '3',
      name: 'Mike Johnson',
      role: 'Technician',
      email: 'mike.johnson@workpro3.com',
      phone: '+1 (555) 345-6789',
      status: 'On Leave',
      skills: ['Mechanical', 'Welding'],
      activeWorkOrders: 0
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return colors.success;
      case 'Busy': return colors.warning;
      case 'On Leave': return colors.error;
      default: return colors.mutedForeground;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Teams</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage your maintenance teams and technicians
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {/* Team Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {teamStats.map((stat, index) => (
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
            placeholder="Search team members..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
      </div>

      {/* Team Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member) => (
          <div 
            key={member.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <User className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <span 
                className="px-2 py-1 text-xs rounded-full"
                style={{ 
                  backgroundColor: `${getStatusColor(member.status)}20`,
                  color: getStatusColor(member.status)
                }}
              >
                {member.status}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold mb-1" style={{ color: colors.foreground }}>
              {member.name}
            </h3>
            <p className="text-sm mb-4" style={{ color: colors.mutedForeground }}>
              {member.role}
            </p>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>{member.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>{member.phone}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: colors.mutedForeground }}>Skills:</p>
              <div className="flex flex-wrap gap-1">
                {member.skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ 
                      backgroundColor: `${colors.accent}20`,
                      color: colors.accent
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.mutedForeground }}>Active Work Orders:</span>
                <span className="text-sm font-medium" style={{ color: colors.foreground }}>
                  {member.activeWorkOrders}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}