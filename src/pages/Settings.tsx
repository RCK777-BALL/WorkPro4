import { Settings as SettingsIcon, User, Bell, Shield, Palette, Building, Globe } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Settings() {
  const { colors } = useTheme();

  const settingsSections = [
    {
      icon: User,
      title: 'Profile Settings',
      description: 'Manage your personal information and preferences',
      color: colors.primary,
      items: ['Personal Information', 'Contact Details', 'Profile Picture', 'Language Preferences']
    },
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Configure notification settings and alerts',
      color: colors.warning,
      items: ['Email Notifications', 'Push Notifications', 'SMS Alerts', 'Notification Schedule']
    },
    {
      icon: Shield,
      title: 'Security',
      description: 'Password, two-factor authentication, and security',
      color: colors.success,
      items: ['Change Password', 'Two-Factor Authentication', 'Login History', 'API Keys']
    },
    {
      icon: Palette,
      title: 'Appearance',
      description: 'Theme, layout, and display preferences',
      color: colors.accent,
      items: ['Theme Selection', 'Color Customization', 'Layout Options', 'Font Size']
    },
    {
      icon: Building,
      title: 'Organization',
      description: 'Company settings and team management',
      color: colors.info,
      items: ['Company Profile', 'Team Members', 'Departments', 'Locations']
    },
    {
      icon: Globe,
      title: 'System',
      description: 'System-wide settings and integrations',
      color: colors.error,
      items: ['Integrations', 'Data Export', 'Backup Settings', 'System Logs']
    }
  ];

  const quickSettings = [
    { label: 'Dark Mode', enabled: false },
    { label: 'Email Notifications', enabled: true },
    { label: 'Auto-save', enabled: true },
    { label: 'Sound Effects', enabled: false }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Settings</h1>
        <p className="mt-1" style={{ color: colors.mutedForeground }}>
          Manage your account and application preferences
        </p>
      </div>

      {/* Quick Settings */}
      <div 
        className="rounded-xl border p-6 shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>Quick Settings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickSettings.map((setting, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm" style={{ color: colors.foreground }}>{setting.label}</span>
              <button
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  setting.enabled ? 'bg-primary' : 'bg-gray-300'
                }`}
                style={{ 
                  backgroundColor: setting.enabled ? colors.primary : colors.mutedForeground + '40'
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    setting.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section, index) => (
          <div 
            key={index} 
            className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="flex items-start gap-4">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${section.color}20` }}
              >
                <section.icon className="w-6 h-6" style={{ color: section.color }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1" style={{ color: colors.foreground }}>
                  {section.title}
                </h3>
                <p className="text-sm mb-3" style={{ color: colors.mutedForeground }}>
                  {section.description}
                </p>
                <div className="space-y-1">
                  {section.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex}
                      className="text-sm py-1 hover:opacity-80 transition-opacity cursor-pointer"
                      style={{ color: colors.foreground }}
                    >
                      • {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Information */}
      <div 
        className="rounded-xl border p-6 shadow-sm"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <h3 className="text-lg font-semibold mb-4" style={{ color: colors.foreground }}>Account Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>Personal Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Name:</span>
                <span style={{ color: colors.foreground }}>John Doe</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Email:</span>
                <span style={{ color: colors.foreground }}>john.doe@workpro3.com</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Role:</span>
                <span style={{ color: colors.foreground }}>Administrator</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Department:</span>
                <span style={{ color: colors.foreground }}>Maintenance</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-2" style={{ color: colors.foreground }}>Account Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Status:</span>
                <span 
                  className="px-2 py-1 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${colors.success}20`,
                    color: colors.success
                  }}
                >
                  Active
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Last Login:</span>
                <span style={{ color: colors.foreground }}>2 hours ago</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Member Since:</span>
                <span style={{ color: colors.foreground }}>January 2024</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: colors.mutedForeground }}>Subscription:</span>
                <span style={{ color: colors.foreground }}>Professional</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}