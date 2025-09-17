"use strict";
exports.__esModule = true;
exports.Settings = void 0;
var react_1 = require("react");
var button_1 = require("@/components/ui/button");
var input_1 = require("@/components/ui/input");
var card_1 = require("@/components/ui/card");
var tabs_1 = require("@/components/ui/tabs");
var badge_1 = require("@/components/ui/badge");
var lucide_react_1 = require("lucide-react");
function Settings() {
    var _a = (0, react_1.useState)('general'), activeTab = _a[0], setActiveTab = _a[1];
    // Mock data
    var mockTenant = {
        name: 'Acme Manufacturing',
        subdomain: 'acme-mfg',
        logoUrl: null,
        primaryColor: '#3B82F6',
        timezone: 'America/New_York',
        dateFormat: 'MM/dd/yyyy',
        numberFormat: 'en-US'
    };
    var mockUser = {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@acme.com',
        role: 'admin'
    };
    var mockUsers = [
        { id: '1', name: 'John Smith', email: 'john.smith@acme.com', role: 'admin', isActive: true },
        { id: '2', name: 'Jane Doe', email: 'jane.doe@acme.com', role: 'planner', isActive: true },
        { id: '3', name: 'Mike Johnson', email: 'mike.johnson@acme.com', role: 'technician', isActive: true },
        { id: '4', name: 'Sarah Wilson', email: 'sarah.wilson@acme.com', role: 'requester', isActive: false },
    ];
    var mockRoles = [
        { name: 'Owner', description: 'Full system access and tenant management', userCount: 1 },
        { name: 'Admin', description: 'Administrative access to all modules', userCount: 2 },
        { name: 'Planner', description: 'Can create and assign work orders', userCount: 3 },
        { name: 'Technician', description: 'Can execute work orders and update status', userCount: 8 },
        { name: 'Requester', description: 'Can create work order requests', userCount: 15 },
        { name: 'Viewer', description: 'Read-only access to reports and dashboards', userCount: 5 },
    ];
    return (<div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account, tenant, and system preferences</p>
        </div>
      </div>

      <tabs_1.Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <tabs_1.TabsList className="grid w-full grid-cols-6">
          <tabs_1.TabsTrigger value="general">General</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="users">Users</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="roles">Roles</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="notifications">Notifications</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="integrations">Integrations</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="security">Security</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center">
                  <lucide_react_1.Building className="w-5 h-5 mr-2"/>
                  Organization Settings
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Organization Name</label>
                  <input_1.Input defaultValue={mockTenant.name} className="mt-1"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subdomain</label>
                  <input_1.Input defaultValue={mockTenant.subdomain} className="mt-1"/>
                  <p className="text-xs text-gray-500 mt-1">
                    Your public portal will be available at: {mockTenant.subdomain}.workpro.com
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Primary Color</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <input_1.Input type="color" defaultValue={mockTenant.primaryColor} className="w-16 h-10"/>
                    <input_1.Input defaultValue={mockTenant.primaryColor} className="flex-1"/>
                  </div>
                </div>
                <button_1.Button>Save Changes</button_1.Button>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center">
                  <lucide_react_1.User className="w-5 h-5 mr-2"/>
                  Profile Settings
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <input_1.Input defaultValue={mockUser.firstName} className="mt-1"/>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <input_1.Input defaultValue={mockUser.lastName} className="mt-1"/>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <input_1.Input defaultValue={mockUser.email} className="mt-1"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <div className="mt-1">
                    <badge_1.Badge>{mockUser.role}</badge_1.Badge>
                  </div>
                </div>
                <button_1.Button>Update Profile</button_1.Button>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Settings className="w-5 h-5 mr-2"/>
                System Preferences
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Timezone</label>
                  <input_1.Input defaultValue={mockTenant.timezone} className="mt-1"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Format</label>
                  <input_1.Input defaultValue={mockTenant.dateFormat} className="mt-1"/>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Number Format</label>
                  <input_1.Input defaultValue={mockTenant.numberFormat} className="mt-1"/>
                </div>
              </div>
              <button_1.Button className="mt-4">Save Preferences</button_1.Button>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="users" className="space-y-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <lucide_react_1.Users className="w-5 h-5 mr-2"/>
                  User Management
                </div>
                <button_1.Button>
                  <lucide_react_1.User className="w-4 h-4 mr-2"/>
                  Invite User
                </button_1.Button>
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-4">
                {mockUsers.map(function (user) { return (<div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <lucide_react_1.User className="w-5 h-5 text-gray-600"/>
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <badge_1.Badge variant="outline">{user.role}</badge_1.Badge>
                      <badge_1.Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </badge_1.Badge>
                      <button_1.Button variant="outline" size="sm">Edit</button_1.Button>
                    </div>
                  </div>); })}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="roles" className="space-y-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Shield className="w-5 h-5 mr-2"/>
                Role Management
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-4">
                {mockRoles.map(function (role) { return (<div key={role.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-gray-500">{role.description}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">{role.userCount} users</span>
                      <button_1.Button variant="outline" size="sm">Configure</button_1.Button>
                    </div>
                  </div>); })}
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="notifications" className="space-y-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Bell className="w-5 h-5 mr-2"/>
                Notification Settings
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Notification preferences will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="integrations" className="space-y-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Webhook className="w-5 h-5 mr-2"/>
                Integrations & Webhooks
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Integration settings will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="security" className="space-y-6">
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Key className="w-5 h-5 mr-2"/>
                Security Settings
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-center text-gray-500 py-12">
                Security and API key management will be implemented here
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </tabs_1.TabsContent>
      </tabs_1.Tabs>
    </div>);
}
exports.Settings = Settings;
