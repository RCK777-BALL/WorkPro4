import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/useToast';
import { formatDate } from '@/lib/utils';

const fileSchema = z.custom(
  (file) =>
    typeof file === 'undefined' ||
    (typeof File !== 'undefined' && file instanceof File),
  {
    message: 'Select a valid file',
  },
);

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional()
    .or(z.literal('')),
  assetId: z.string().min(1, 'Asset is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Select a priority' }),
  }),
  dueDate: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      'Enter a valid due date',
    ),
  assignedTo: z
    .string()
    .max(255, 'Assigned to must be 255 characters or fewer')
    .optional()
    .or(z.literal('')),
  category: z
    .string()
    .max(255, 'Category must be 255 characters or fewer')
    .optional()
    .or(z.literal('')),
  attachments: z.array(fileSchema).default([]),
});

const DEFAULT_VALUES = {
  title: '',
  description: '',
  priority: 'medium',
  assetId: '',
  lineName: '',
  stationNumber: '',
  assignees: [''],
  checklists: [{ text: '', note: '' }],
};

export function WorkOrderForm({ onClose, onSuccess, defaultValues }) {

  const [submitError, setSubmitError] = useState('');
  const { toast } = useToast();

  const assetIdentifier = useMemo(
    () => asset?._id ?? asset?.id ?? asset?.assetId ?? asset?.tag ?? '',
    [asset],
  );

  const form = useForm({
    resolver: zodResolver(workOrderSchema),
    defaultValues: { ...DEFAULT_VALUES, ...(defaultValues || {}) },

  });

  const { register, handleSubmit, setError, setValue, watch, formState } = form;
  const { errors, isSubmitting } = formState;

  const attachments = watch('attachments') || [];

  useEffect(() => {
    register('attachments');
  }, [register]);

  useEffect(() => {
    if (assetIdentifier) {
      setValue('assetId', assetIdentifier, { shouldValidate: true });
    }
  }, [assetIdentifier, setValue]);

  const priorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
    [],
  );

  const handleApiErrors = (error) => {
    if (!error) {
      const fallback = 'Unable to create work order';
      setSubmitError(fallback);
      return fallback;
    }

    let message = error.message || 'Unable to create work order';

    if (error.fields && typeof error.fields === 'object') {
      Object.entries(error.fields).forEach(([field, fieldMessage]) => {
        const resolvedMessage = fieldMessage || message;
        setError(field, {
          type: 'server',
          message: resolvedMessage,
        });
        if (resolvedMessage) {
          message = resolvedMessage;
        }
      });
    }

    if (Array.isArray(error.details)) {
      error.details.forEach((detail) => {
        if (!detail?.path) return;
        const fieldPath = Array.isArray(detail.path)
          ? detail.path.join('.')
          : detail.path;

        if (fieldPath) {
          setError(fieldPath, {
            type: 'server',
            message: detail.message || error.message || 'Validation error',
          });
          message = detail.message || message;
        }
      });
    }

    setSubmitError(message);
    return message;
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');

    const payload = {
      title: values.title,
      description: values.description?.trim() ? values.description : undefined,
      priority: values.priority,
      assetId: values.assetId,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : undefined,
      assignedTo: values.assignedTo?.trim() ? values.assignedTo : undefined,
      category: values.category?.trim() ? values.category : undefined,
      attachments: attachments.map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    };

    try {
      const result = await api.post('/work-orders', payload);
      form.reset({
        title: '',
        description: '',
        assetId: assetIdentifier || '',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        category: '',
        attachments: [],
      });
      toast({
        title: 'Work order created',
        description: 'The work order was created successfully.',
        variant: 'success',
      });
      if (typeof onSuccess === 'function') {
        onSuccess(result?.data ?? result);
      }
      if (!onSuccess && typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      const payloadError = error?.data?.error ?? {
        message: error?.message || 'Unable to create work order',
      };
      const message = handleApiErrors(payloadError);
      toast({
        title: 'Failed to create work order',
        description: message,
        variant: 'error',
      });
    }
  });

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files ?? []);
    setValue('attachments', [...attachments, ...files], {
      shouldValidate: true,
    });
    event.target.value = '';
  };

  const handleRemoveAttachment = (index) => {
    const next = attachments.filter((_, i) => i !== index);
    setValue('attachments', next, { shouldValidate: true });
  };

  const assetMetadata = useMemo(() => {
    if (!asset) return [];

    const installedValue = asset.purchasedDate || asset.installedAt;
    const formattedInstalled = installedValue ? formatDate(installedValue) : null;

    return [
      { label: 'Tag', value: asset.tag || asset.assetTag || asset.assetId },
      { label: 'Location', value: asset.location },
      { label: 'Status', value: asset.status },
      formattedInstalled
        ? {
            label: 'Installed',
            value: formattedInstalled,
          }
        : null,
    ].filter((item) => item && item.value);
  }, [asset]);

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      {asset && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3">
          <p className="text-sm font-semibold text-gray-900">{asset.name}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
            {assetMetadata.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="font-medium text-gray-700">{item.label}:</span>
                <span className="truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <Input placeholder="Work order title" {...register('title')} />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Description <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          {...register('description')}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          rows={4}
          placeholder="Describe the work to be completed"
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <select
            {...register('priority')}
            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select priority</option>
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors.priority && (
            <p className="text-sm text-red-600">{errors.priority.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Asset ID</label>
          <Input
            placeholder="Asset identifier"
            {...register('assetId')}
            readOnly={Boolean(assetIdentifier)}
            disabled={Boolean(assetIdentifier)}
          />
          {errors.assetId && (
            <p className="text-sm text-red-600">{errors.assetId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Due Date <span className="text-gray-400">(optional)</span>
          </label>
          <Input type="date" {...register('dueDate')} />
          {errors.dueDate && (
            <p className="text-sm text-red-600">{errors.dueDate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Assigned To <span className="text-gray-400">(optional)</span>
          </label>
          <Input placeholder="Technician or team" {...register('assignedTo')} />
          {errors.assignedTo && (
            <p className="text-sm text-red-600">{errors.assignedTo.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Category <span className="text-gray-400">(optional)</span>
          </label>
          <Input placeholder="Maintenance category" {...register('category')} />
          {errors.category && (
            <p className="text-sm text-red-600">{errors.category.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Attachments <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="file"
          multiple
          onChange={handleAttachmentChange}
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {errors.attachments && !Array.isArray(errors.attachments) && (
          <p className="text-sm text-red-600">{errors.attachments.message}</p>
        )}
        {attachments.length > 0 && (
          <ul className="space-y-2 rounded-md border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-700">
            {attachments.map((file, index) => (
              <li
                key={`${file.name}-${file.lastModified ?? index}`}
                className="flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(1)} KB · {file.type || 'Unknown type'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleRemoveAttachment(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {submitError && <p className="text-sm text-red-600">{submitError}</p>}

      <div className="flex items-center justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating…' : 'Create Work Order'}
        </Button>
      </div>
    </form>
  );
}
