import { useState } from 'react';
import {
  Bell,
  Building,
  Key,
  Settings as SettingsIcon,
  Shield,
  User as UserIcon,
  Users,
  Webhook,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const mockTenant = {
  name: 'Acme Manufacturing',
  subdomain: 'acme-mfg',
  logoUrl: null,
  primaryColor: '#3B82F6',
  timezone: 'America/New_York',
  dateFormat: 'MM/dd/yyyy',
  numberFormat: 'en-US',
};

const mockUser = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@acme.com',
  role: 'admin',
};

const mockUsers = [
  { id: '1', name: 'John Smith', email: 'john.smith@acme.com', role: 'admin', isActive: true },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@acme.com', role: 'planner', isActive: true },
  { id: '3', name: 'Mike Johnson', email: 'mike.johnson@acme.com', role: 'technician', isActive: true },
  { id: '4', name: 'Sarah Wilson', email: 'sarah.wilson@acme.com', role: 'requester', isActive: false },
];

const mockRoles = [
  { name: 'Owner', description: 'Full system access and tenant management', userCount: 1 },
  { name: 'Admin', description: 'Administrative access to all modules', userCount: 2 },
  { name: 'Planner', description: 'Can create and assign work orders', userCount: 3 },
  { name: 'Technician', description: 'Can execute work orders and update status', userCount: 8 },
  { name: 'Requester', description: 'Can create work order requests', userCount: 15 },
  { name: 'Viewer', description: 'Read-only access to reports and dashboards', userCount: 5 },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">
            Manage your account, tenant, and system preferences
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Organization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Organization Name</label>
                  <Input defaultValue={mockTenant.name} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subdomain</label>
                  <Input defaultValue={mockTenant.subdomain} className="mt-1" />
                  <p className="text-xs text-gray-500 mt-1">
                    Your public portal will be available at: {mockTenant.subdomain}.workpro.com
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Primary Color</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Input type="color" defaultValue={mockTenant.primaryColor} className="w-16 h-10" />
                    <Input defaultValue={mockTenant.primaryColor} className="flex-1" />
                  </div>
                </div>
                <Button>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="w-5 h-5 mr-2" />
                  Profile Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">First Name</label>
                    <Input defaultValue={mockUser.firstName} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Last Name</label>
                    <Input defaultValue={mockUser.lastName} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <Input defaultValue={mockUser.email} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <div className="mt-1">
                    <Badge>{mockUser.role}</Badge>
                  </div>
                </div>
                <Button>Update Profile</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <SettingsIcon className="w-5 h-5 mr-2" />
                System Preferences
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Timezone</label>
                  <Input defaultValue={mockTenant.timezone} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Date Format</label>
                  <Input defaultValue={mockTenant.dateFormat} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Number Format</label>
                  <Input defaultValue={mockTenant.numberFormat} className="mt-1" />
                </div>
              </div>
              <Button className="mt-4">Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  User Management
                </div>
                <Button>
                  <UserIcon className="w-4 h-4 mr-2" />
                  Invite User
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <UserIcon className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{user.role}</Badge>
                      <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Role Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRoles.map((role) => (
                  <div key={role.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{role.name}</div>
                      <div className="text-sm text-gray-500">{role.description}</div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500">{role.userCount} users</span>
                      <Button variant="outline" size="sm">
                        Configure
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="w-5 h-5 mr-2" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Notification preferences will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Webhook className="w-5 h-5 mr-2" />
                Integrations & Webhooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Integration settings will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Security and API key management will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
