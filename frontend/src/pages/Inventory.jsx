import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Barcode,
  Building,
  DollarSign,
  Package,
  Plus,
  Search,
  TrendingDown,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';

const mockParts = [
  {
    id: '1',
    sku: 'PUMP-SEAL-001',
    name: 'Pump Seal Kit',
    description: 'Replacement seal kit for centrifugal pumps',
    category: 'Seals & Gaskets',
    unitOfMeasure: 'each',
    onHand: 15,
    reserved: 2,
    available: 13,
    unitCostAvg: 45.5,
    minStock: 5,
    maxStock: 25,
    reorderPoint: 8,
    vendorName: 'Industrial Supply Co.',
  },
  {
    id: '2',
    sku: 'BELT-V-002',
    name: 'V-Belt 4L360',
    description: 'Standard V-belt for motor drives',
    category: 'Belts & Chains',
    unitOfMeasure: 'each',
    onHand: 3,
    reserved: 0,
    available: 3,
    unitCostAvg: 12.75,
    minStock: 10,
    maxStock: 50,
    reorderPoint: 15,
    vendorName: 'Belt & Drive Solutions',
  },
  {
    id: '3',
    sku: 'OIL-HYD-003',
    name: 'Hydraulic Oil ISO 46',
    description: 'Premium hydraulic fluid',
    category: 'Fluids & Lubricants',
    unitOfMeasure: 'gallon',
    onHand: 25,
    reserved: 5,
    available: 20,
    unitCostAvg: 8.25,
    minStock: 15,
    maxStock: 100,
    reorderPoint: 20,
    vendorName: 'Lubricant Specialists',
  },
];

export function Inventory() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: parts = mockParts, isLoading } = useQuery({
    queryKey: ['parts', { search, category: categoryFilter }],
    queryFn: async () => {
      return mockParts.filter((part) => {
        const matchesSearch =
          !search ||
          part.name.toLowerCase().includes(search.toLowerCase()) ||
          part.sku.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !categoryFilter || part.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
    },
  });

  const totalParts = parts.length;
  const lowStockParts = parts.filter((part) => part.available <= part.reorderPoint).length;
  const totalValue = parts.reduce((sum, part) => sum + part.onHand * part.unitCostAvg, 0);
  const categories = [...new Set(parts.map((part) => part.category))];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse" />
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500">Manage parts, stock levels, and purchasing</p>
        </div>
        <Button className="flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          New Part
        </Button>
      </div>

      {/* Inventory Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalParts}</div>
            <div className="text-sm text-gray-500">Total Parts</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{lowStockParts}</div>
            <div className="text-sm text-gray-500">Low Stock</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
            <div className="text-sm text-gray-500">Categories</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setCategoryFilter('')}
          className={categoryFilter === '' ? 'bg-primary text-primary-foreground' : ''}
        >
          All Categories
        </Button>
        {categories.slice(0, 3).map((category) => (
          <Button
            key={category}
            variant="outline"
            onClick={() =>
              setCategoryFilter(categoryFilter === category ? '' : category)
            }
            className={
              categoryFilter === category ? 'bg-primary text-primary-foreground' : ''
            }
          >
            {category}
          </Button>
        ))}
      </div>

      <Tabs defaultValue="parts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="parts">Parts</TabsTrigger>
          <TabsTrigger value="vendors">Vendors</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="parts" className="space-y-4">
          {parts.map((part) => (
            <Card key={part.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {part.name}
                      </h3>
                      <Badge variant="outline" className="font-mono text-xs">
                        {part.sku}
                      </Badge>
                      <Badge variant="outline">{part.category}</Badge>
                      {part.available <= part.reorderPoint && (
                        <Badge className="bg-red-100 text-red-800 flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock
                        </Badge>
                      )}
                    </div>

                    {part.description && (
                      <p className="text-gray-600 mb-3">{part.description}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">On Hand:</span>
                        <div className="font-medium">
                          {part.onHand} {part.unitOfMeasure}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Available:</span>
                        <div className="font-medium">
                          {part.available} {part.unitOfMeasure}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Unit Cost:</span>
                        <div className="font-medium">{formatCurrency(part.unitCostAvg)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Total Value:</span>
                        <div className="font-medium">
                          {formatCurrency(part.onHand * part.unitCostAvg)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Min: {part.minStock}</span>
                      <span>Max: {part.maxStock}</span>
                      <span>Reorder: {part.reorderPoint}</span>
                      {part.vendorName && (
                        <div className="flex items-center">
                          <Building className="w-4 h-4 mr-1" />
                          {part.vendorName}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Package className="w-4 h-4 mr-1" />
                        Adjust
                      </Button>
                      <Button variant="outline" size="sm">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        Issue
                      </Button>
                      <Button variant="outline" size="sm">
                        <Barcode className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          part.available <= part.reorderPoint
                            ? 'bg-red-500'
                            : part.available <= part.minStock
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min((part.available / part.maxStock) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Vendor Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Vendor management will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Inventory Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                Transaction history will be implemented here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {parts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No parts found</h3>
            <p className="text-gray-500 mb-6">
              {search || categoryFilter
                ? 'Try adjusting your search or filter criteria'
                : 'Get started by adding your first inventory part'}
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Part
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
