import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { X, Plus, Trash2 } from 'lucide-react';

interface WorkOrderFormData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assetId?: string;
  assignees: string[];
  checklists: { text: string; note?: string }[];
}

interface Asset {
  id: string;
  code: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface WorkOrderFormProps {
  workOrderId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type ExistingWorkOrder = {
  title?: string | null;
  description?: string | null;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
  assetId?: string | null;
  assignees?: unknown;
  checklists?: Array<{
    text?: string | null;
    note?: string | null;
    [key: string]: unknown;
  }> | null;
};

export function WorkOrderForm({ workOrderId, onClose, onSuccess }: WorkOrderFormProps) {
  const [checklistItems, setChecklistItems] = useState<{ text: string; note?: string }[]>([]);
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<WorkOrderFormData>({
    defaultValues: {
      priority: 'medium',
      assignees: [],
      checklists: []
    }
  });

  // Fetch assets for dropdown
  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: async (): Promise<Asset[]> => {
      const result = await api.get<{ sites?: any[] }>('/assets/tree');
      const sites = Array.isArray(result?.sites) ? result.sites : [];
      // Flatten the asset tree structure
      const allAssets: Asset[] = [];
      sites.forEach((site) => {
        const areas = Array.isArray(site?.areas) ? site.areas : [];
        areas.forEach((area: any) => {
          const lines = Array.isArray(area?.lines) ? area.lines : [];
          lines.forEach((line: any) => {
            const stations = Array.isArray(line?.stations) ? line.stations : [];
            stations.forEach((station: any) => {
              const stationAssets = Array.isArray(station?.assets) ? station.assets : [];
              stationAssets.forEach((asset: Asset) => {
                if (asset?.id && asset?.name) {
                  allAssets.push(asset);
                }
              });
            });
          });
        });
      });
      return allAssets;
    }
  });

  useEffect(() => {
    if (!existingWorkOrder) return;

    const sanitizedAssignees = Array.isArray(existingWorkOrder.assignees)
      ? existingWorkOrder.assignees.filter((assignee: unknown): assignee is string => typeof assignee === 'string')
      : [];

    const sanitizedChecklists = Array.isArray(existingWorkOrder.checklists)
      ? existingWorkOrder.checklists.map((item: any) => ({
          text: typeof item?.text === 'string' ? item.text : '',
          note: typeof item?.note === 'string' ? item.note : ''
        }))
      : [];

    reset({
      title: existingWorkOrder.title ?? '',
      description: existingWorkOrder.description ?? '',
      priority: existingWorkOrder.priority ?? 'medium',
      assetId: existingWorkOrder.assetId ?? '',
      assignees: sanitizedAssignees,
      checklists: sanitizedChecklists
    });

    setValue('checklists', sanitizedChecklists);
    setChecklistItems(sanitizedChecklists);
  }, [existingWorkOrder, reset, setValue]);

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async (): Promise<User[]> => {
      const result = await api.get<User[]>('/users');
      return Array.isArray(result) ? result : [];
    }
  });

  // Fetch existing work order if editing
  const { data: existingWorkOrder } = useQuery<ExistingWorkOrder | null>({
    queryKey: ['work-order', workOrderId],
    queryFn: async (): Promise<ExistingWorkOrder | null> => {
      if (!workOrderId) return null;
      return api.get<ExistingWorkOrder>(`/work-orders/${workOrderId}`);
    },
    enabled: !!workOrderId
  });

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: WorkOrderFormData) => {
      const payload = {
        ...data,
        checklists: checklistItems
      };
      
      if (workOrderId) {
        return api.put(`/work-orders/${workOrderId}`, payload);
      } else {
        return api.post('/work-orders', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      onSuccess?.();
      onClose();
    }
  });

  const addChecklistItem = () => {
    setChecklistItems([...checklistItems, { text: '', note: '' }]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const updateChecklistItem = (index: number, field: 'text' | 'note', value: string) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], [field]: value };
    setChecklistItems(updated);
  };

  const onSubmit = (data: WorkOrderFormData) => {
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {workOrderId ? 'Edit Work Order' : 'Create New Work Order'}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <Input
                {...register('title', { required: 'Title is required' })}
                placeholder="Enter work order title"
              />
              {errors.title && (
                <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the work to be performed"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Asset
              </label>
              <select
                {...register('assetId')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an asset (optional)</option>
                {assets.map(asset => (
                  <option key={asset.id} value={asset.id}>
                    {asset.code} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign To
              </label>
              <select
                multiple
                {...register('assignees')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                size={4}
              >
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple users
              </p>
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Checklist Items
                </label>
                <Button type="button" variant="outline" size="sm" onClick={addChecklistItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {checklistItems.map((item, index) => (
                  <div key={index} className="flex items-start space-x-2 p-3 border rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Checklist item"
                        value={item.text}
                        onChange={(e) => updateChecklistItem(index, 'text', e.target.value)}
                      />
                      <Input
                        placeholder="Notes (optional)"
                        value={item.note || ''}
                        onChange={(e) => updateChecklistItem(index, 'note', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChecklistItem(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Saving...' : workOrderId ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}