import { PackageSearch, Plus, Search, Package, AlertTriangle, TrendingDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Inventory() {
  const { colors } = useTheme();

  const inventoryStats = [
    { label: 'Total Parts', count: 1250, color: colors.primary },
    { label: 'Low Stock', count: 23, color: colors.error },
    { label: 'Out of Stock', count: 5, color: colors.error },
    { label: 'Total Value', count: '$125K', color: colors.success }
  ];

  const parts = [
    {
      id: '1',
      sku: 'PUMP-SEAL-001',
      name: 'Pump Seal Kit',
      category: 'Seals & Gaskets',
      onHand: 15,
      reserved: 2,
      available: 13,
      minStock: 5,
      maxStock: 25,
      unitCost: 45.50,
      vendor: 'Industrial Supply Co.',
      status: 'In Stock'
    },
    {
      id: '2',
      sku: 'BELT-V-002',
      name: 'V-Belt 4L360',
      category: 'Belts & Chains',
      onHand: 3,
      reserved: 0,
      available: 3,
      minStock: 10,
      maxStock: 50,
      unitCost: 12.75,
      vendor: 'Belt & Drive Solutions',
      status: 'Low Stock'
    },
    {
      id: '3',
      sku: 'OIL-HYD-003',
      name: 'Hydraulic Oil ISO 46',
      category: 'Fluids & Lubricants',
      onHand: 0,
      reserved: 0,
      available: 0,
      minStock: 15,
      maxStock: 100,
      unitCost: 8.25,
      vendor: 'Lubricant Specialists',
      status: 'Out of Stock'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Stock': return colors.success;
      case 'Low Stock': return colors.warning;
      case 'Out of Stock': return colors.error;
      default: return colors.mutedForeground;
    }
  };

  const getStockLevel = (available: number, minStock: number, maxStock: number) => {
    return Math.min((available / maxStock) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Inventory</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage parts, stock levels, and purchasing
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          New Part
        </button>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {inventoryStats.map((stat, index) => (
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
            placeholder="Search parts..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
      </div>

      {/* Parts List */}
      <div className="space-y-4">
        {parts.map((part) => (
          <div 
            key={part.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                    {part.name}
                  </h3>
                  <span 
                    className="px-2 py-1 text-xs rounded-full font-mono"
                    style={{ 
                      backgroundColor: `${colors.mutedForeground}20`,
                      color: colors.mutedForeground
                    }}
                  >
                    {part.sku}
                  </span>
                  <span 
                    className="px-2 py-1 text-xs rounded-full"
                    style={{ 
                      backgroundColor: `${colors.accent}20`,
                      color: colors.accent
                    }}
                  >
                    {part.category}
                  </span>
                  <span 
                    className="px-2 py-1 text-xs rounded-full flex items-center gap-1"
                    style={{ 
                      backgroundColor: `${getStatusColor(part.status)}20`,
                      color: getStatusColor(part.status)
                    }}
                  >
                    {part.status === 'Low Stock' && <AlertTriangle className="w-3 h-3" />}
                    {part.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span style={{ color: colors.mutedForeground }}>On Hand:</span>
                    <div className="font-medium" style={{ color: colors.foreground }}>{part.onHand}</div>
                  </div>
                  <div>
                    <span style={{ color: colors.mutedForeground }}>Available:</span>
                    <div className="font-medium" style={{ color: colors.foreground }}>{part.available}</div>
                  </div>
                  <div>
                    <span style={{ color: colors.mutedForeground }}>Unit Cost:</span>
                    <div className="font-medium" style={{ color: colors.foreground }}>${part.unitCost}</div>
                  </div>
                  <div>
                    <span style={{ color: colors.mutedForeground }}>Total Value:</span>
                    <div className="font-medium" style={{ color: colors.foreground }}>
                      ${(part.onHand * part.unitCost).toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm mb-3" style={{ color: colors.mutedForeground }}>
                  <span>Min: {part.minStock}</span>
                  <span>Max: {part.maxStock}</span>
                  <span>Vendor: {part.vendor}</span>
                </div>
                
                {/* Stock Level Indicator */}
                <div className="mb-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: colors.mutedForeground }}>Stock Level</span>
                    <span style={{ color: colors.foreground }}>
                      {part.available}/{part.maxStock}
                    </span>
                  </div>
                  <div 
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: `${colors.mutedForeground}20` }}
                  >
                    <div 
                      className="h-full transition-all"
                      style={{ 
                        width: `${getStockLevel(part.available, part.minStock, part.maxStock)}%`,
                        backgroundColor: part.available <= part.minStock ? colors.error : 
                                       part.available <= part.minStock * 2 ? colors.warning : colors.success
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <div className="flex space-x-2">
                  <button 
                    className="flex items-center gap-1 px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                    style={{ borderColor: colors.border, color: colors.foreground }}
                  >
                    <Package className="w-4 h-4" />
                    Adjust
                  </button>
                  <button 
                    className="flex items-center gap-1 px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                    style={{ borderColor: colors.border, color: colors.foreground }}
                  >
                    <TrendingDown className="w-4 h-4" />
                    Issue
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}