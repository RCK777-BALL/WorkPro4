import { Handshake, Plus, Search, Building, Mail, Phone, MapPin } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Vendors() {
  const { colors } = useTheme();

  const vendorStats = [
    { label: 'Total Vendors', count: 45, color: colors.primary },
    { label: 'Active Contracts', count: 32, color: colors.success },
    { label: 'Pending Orders', count: 8, color: colors.warning },
    { label: 'Total Spend', count: '$245K', color: colors.info }
  ];

  const vendors = [
    {
      id: '1',
      name: 'Industrial Supply Co.',
      category: 'General Supplies',
      contact: {
        email: 'orders@industrialsupply.com',
        phone: '+1 (555) 123-4567',
        address: '123 Industrial Blvd, Factory City, FC 12345'
      },
      status: 'Active',
      rating: 4.8,
      totalOrders: 156,
      totalSpend: 45000,
      lastOrder: '2 days ago'
    },
    {
      id: '2',
      name: 'Belt & Drive Solutions',
      category: 'Power Transmission',
      contact: {
        email: 'sales@beltdrive.com',
        phone: '+1 (555) 234-5678',
        address: '456 Drive Way, Belt Town, BT 67890'
      },
      status: 'Active',
      rating: 4.5,
      totalOrders: 89,
      totalSpend: 32000,
      lastOrder: '1 week ago'
    },
    {
      id: '3',
      name: 'Lubricant Specialists',
      category: 'Fluids & Lubricants',
      contact: {
        email: 'info@lubricants.com',
        phone: '+1 (555) 345-6789',
        address: '789 Oil Street, Fluid City, FL 13579'
      },
      status: 'Inactive',
      rating: 4.2,
      totalOrders: 23,
      totalSpend: 8500,
      lastOrder: '3 months ago'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return colors.success;
      case 'Inactive': return colors.mutedForeground;
      case 'Suspended': return colors.error;
      default: return colors.mutedForeground;
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return colors.success;
    if (rating >= 4.0) return colors.warning;
    return colors.error;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Vendors</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage vendor relationships and contracts
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          New Vendor
        </button>
      </div>

      {/* Vendor Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {vendorStats.map((stat, index) => (
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
            placeholder="Search vendors..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
      </div>

      {/* Vendors List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div 
            key={vendor.id}
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-start justify-between mb-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${colors.primary}20` }}
              >
                <Building className="w-6 h-6" style={{ color: colors.primary }} />
              </div>
              <span 
                className="px-2 py-1 text-xs rounded-full"
                style={{ 
                  backgroundColor: `${getStatusColor(vendor.status)}20`,
                  color: getStatusColor(vendor.status)
                }}
              >
                {vendor.status}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold mb-1" style={{ color: colors.foreground }}>
              {vendor.name}
            </h3>
            <p className="text-sm mb-4" style={{ color: colors.mutedForeground }}>
              {vendor.category}
            </p>
            
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>{vendor.contact.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>{vendor.contact.phone}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" style={{ color: colors.mutedForeground }} />
                <span style={{ color: colors.foreground }}>{vendor.contact.address}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span style={{ color: colors.mutedForeground }}>Rating:</span>
                <div className="flex items-center gap-1">
                  <span className="font-medium" style={{ color: getRatingColor(vendor.rating) }}>
                    {vendor.rating}
                  </span>
                  <span style={{ color: colors.mutedForeground }}>/ 5.0</span>
                </div>
              </div>
              <div>
                <span style={{ color: colors.mutedForeground }}>Orders:</span>
                <div className="font-medium" style={{ color: colors.foreground }}>{vendor.totalOrders}</div>
              </div>
            </div>
            
            <div className="pt-4" style={{ borderTop: `1px solid ${colors.border}` }}>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <span style={{ color: colors.mutedForeground }}>Total Spend:</span>
                  <div className="font-medium" style={{ color: colors.foreground }}>
                    ${vendor.totalSpend.toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <span style={{ color: colors.mutedForeground }}>Last Order:</span>
                  <div className="font-medium" style={{ color: colors.foreground }}>{vendor.lastOrder}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}