import { Boxes, Plus, Search, Filter, Building2, MapPin, Calendar, DollarSign } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Assets() {
  const { colors } = useTheme();

  const assetStats = [
    { label: 'Total Assets', value: '234', color: colors.primary },
    { label: 'Operational', value: '198', color: colors.success },
    { label: 'Under Maintenance', value: '12', color: colors.warning },
    { label: 'Down', value: '3', color: colors.error }
  ];

  const assets = [
    {
      id: '1',
      code: 'PUMP-001',
      name: 'Main Water Pump',
      status: 'Operational',
      location: 'Building A - Mechanical Room',
      lastService: '2 days ago',
      nextService: 'In 28 days',
      value: '$15,000'
    },
    {
      id: '2',
      code: 'CONV-002',
      name: 'Production Line Conveyor',
      status: 'Maintenance',
      location: 'Building B - Production Floor',
      lastService: '1 week ago',
      nextService: 'In progress',
      value: '$25,000'
    },
    {
      id: '3',
      code: 'HVAC-003',
      name: 'HVAC Unit #3',
      status: 'Down',
      location: 'Building A - Roof',
      lastService: '3 days ago',
      nextService: 'Overdue',
      value: '$8,000'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operational': return colors.success;
      case 'Maintenance': return colors.warning;
      case 'Down': return colors.error;
      default: return colors.mutedForeground;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Assets</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage your equipment, facilities, and asset hierarchy
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          New Asset
        </button>
      </div>

      {/* Asset Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {assetStats.map((stat, index) => (
          <div 
            key={index}
            className="rounded-xl border p-4 shadow-sm text-center hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-sm" style={{ color: colors.mutedForeground }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
            style={{ color: colors.mutedForeground }}
          />
          <input
            type="text"
            placeholder="Search assets..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-opacity-80 transition-colors"
          style={{ borderColor: colors.border, color: colors.foreground }}
        >
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assets.map((asset) => (
          <div 
            key={asset.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Boxes className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <span 
                className="px-2 py-1 text-xs rounded-full"
                style={{ 
                  backgroundColor: `${getStatusColor(asset.status)}20`,
                  color: getStatusColor(asset.status)
                }}
              >
                {asset.status}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold mb-1" style={{ color: colors.foreground }}>
              {asset.name}
            </h3>
            <p className="text-sm mb-4" style={{ color: colors.mutedForeground }}>
              {asset.code}
            </p>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>{asset.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>Last service: {asset.lastService}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>Value: {asset.value}</span>
              </div>
            </div>
            
            <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: colors.mutedForeground }}>Next service:</span>
                <span 
                  className="text-sm font-medium"
                  style={{ 
                    color: asset.nextService === 'Overdue' ? colors.error : 
                           asset.nextService === 'In progress' ? colors.warning : colors.success
                  }}
                >
                  {asset.nextService}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}