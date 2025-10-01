import { useMemo, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

const workOrderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent'], {
    errorMap: () => ({ message: 'Select a priority' }),
  }),
  assetId: z.string().min(1, 'Asset is required'),
  lineName: z.string().min(1, 'Line name is required'),
  stationNumber: z.string().min(1, 'Station number is required'),
  assignees: z
    .array(z.string().min(1, 'Assignee is required'))
    .min(1, 'Add at least one assignee'),
  checklists: z
    .array(
      z.object({
        text: z.string().min(1, 'Checklist item is required'),
        note: z.string().optional(),
      })
    )
    .min(1, 'Add at least one checklist item'),
});

export function WorkOrderForm({ onClose, onSuccess }) {
  const [submitError, setSubmitError] = useState('');
  const form = useForm({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      assetId: '',
      lineName: '',
      stationNumber: '',
      assignees: [''],
      checklists: [{ text: '', note: '' }],
    },
  });

  const {
    control,
    handleSubmit,
    register,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = form;

  const assigneeFields = useFieldArray({ control, name: 'assignees' });
  const checklistFields = useFieldArray({ control, name: 'checklists' });

  const priorityOptions = useMemo(
    () => [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' },
      { value: 'urgent', label: 'Urgent' },
    ],
    []
  );

  const handleApiErrors = (error) => {
    if (!error) return;

    if (error.fields && typeof error.fields === 'object') {
      Object.entries(error.fields).forEach(([fieldPath, fieldError]) => {
        if (!fieldPath) return;

        const messages = Array.isArray(fieldError) ? fieldError : [fieldError];
        const message = messages.find((msg) => typeof msg === 'string' && msg.trim().length > 0);

        setError(fieldPath, {
          type: 'server',
          message: message || error.message || 'Validation error',
        });
      });
    } else if (Array.isArray(error.details)) {
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
        }
      });
    }

    setSubmitError(error.message || 'Unable to create work order');
  };

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('');

    const payload = {
      title: values.title,
      description: values.description,
      priority: values.priority,
      assetId: values.assetId,
      lineName: values.lineName,
      stationNumber: values.stationNumber,
      assignees: values.assignees.filter((id) => id.trim().length > 0),
      checklists: values.checklists
        .filter((item) => item.text.trim().length > 0)
        .map((item) => ({
          text: item.text,
          note: item.note || undefined,
        })),
    };

    try {
      const result = await api.post('/work-orders', payload);
      reset();
      if (typeof onSuccess === 'function') {
        onSuccess(result?.data ?? result);
      }
    } catch (error) {
      const payloadError = error?.data?.error ?? {
        message: error?.message || 'Unable to create work order',
      };
      handleApiErrors(payloadError);
    }
  });

  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Title</label>
        <Input placeholder="Work order title" {...register('title')} />
        {errors.title && (
          <p className="text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Description</label>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Input placeholder="Asset identifier" {...register('assetId')} />
          {errors.assetId && (
            <p className="text-sm text-red-600">{errors.assetId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Line Name</label>
          <Input placeholder="Associated line" {...register('lineName')} />
          {errors.lineName && (
            <p className="text-sm text-red-600">{errors.lineName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Station Number</label>
          <Input placeholder="Station identifier" {...register('stationNumber')} />
          {errors.stationNumber && (
            <p className="text-sm text-red-600">{errors.stationNumber.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Assignees</h3>
            <p className="text-sm text-gray-500">
              Assign at least one technician or team member responsible for this work.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => assigneeFields.append('')}
          >
            Add Assignee
          </Button>
        </div>
        {errors.assignees && !Array.isArray(errors.assignees) && (
          <p className="text-sm text-red-600">{errors.assignees.message}</p>
        )}
        <div className="space-y-3">
          {assigneeFields.fields.map((field, index) => (
            <div key={field.id} className="flex items-center space-x-2">
              <Input
                placeholder="Assignee ID or email"
                {...register(`assignees.${index}`)}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => assigneeFields.remove(index)}
                disabled={assigneeFields.fields.length === 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        {Array.isArray(errors.assignees) &&
          errors.assignees.map((assigneeError, index) =>
            assigneeError ? (
              <p key={`assignee-error-${index}`} className="text-sm text-red-600">
                {assigneeError.message}
              </p>
            ) : null
          )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Checklist</h3>
            <p className="text-sm text-gray-500">
              Outline the tasks that must be completed for this work order.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => checklistFields.append({ text: '', note: '' })}
          >
            Add Item
          </Button>
        </div>
        {errors.checklists && !Array.isArray(errors.checklists) && (
          <p className="text-sm text-red-600">{errors.checklists.message}</p>
        )}
        <div className="space-y-4">
          {checklistFields.fields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Item
                  </label>
                  <Input
                    placeholder="Checklist task"
                    {...register(`checklists.${index}.text`)}
                  />
                  {errors.checklists?.[index]?.text && (
                    <p className="text-sm text-red-600">
                      {errors.checklists[index].text.message}
                    </p>
                  )}
                  <label className="block text-sm font-medium text-gray-700">
                    Note (optional)
                  </label>
                  <textarea
                    {...register(`checklists.${index}.note`)}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    rows={2}
                    placeholder="Add guidance or notes for this task"
                  />
                  {errors.checklists?.[index]?.note && (
                    <p className="text-sm text-red-600">
                      {errors.checklists[index].note.message}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="ml-4"
                  onClick={() => checklistFields.remove(index)}
                  disabled={checklistFields.fields.length === 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
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
