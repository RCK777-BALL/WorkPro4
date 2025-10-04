import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrapApiResult } from '@/lib/api';

function invalidateAssetQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['assets'] }).catch((error) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to invalidate asset queries', error);
    }
  });
}

export function useUpdateAssetMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, payload }) => {
      if (!assetId) {
        throw new Error('assetId is required to update an asset.');
      }

      const response = await api.patch(`/assets/${assetId}`, payload);
      return unwrapApiResult(response);
    },
    ...(options ?? {}),
    onSuccess: (data, variables, context) => {
      invalidateAssetQueries(queryClient);
      if (typeof options?.onSuccess === 'function') {
        options.onSuccess(data, variables, context);
      }
    },
  });
}

export function useDeleteAssetMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assetId) => {
      if (!assetId) {
        throw new Error('assetId is required to delete an asset.');
      }

      const response = await api.delete(`/assets/${assetId}`);
      return unwrapApiResult(response);
    },
    ...(options ?? {}),
    onSuccess: (data, variables, context) => {
      invalidateAssetQueries(queryClient);
      if (typeof options?.onSuccess === 'function') {
        options.onSuccess(data, variables, context);
      }
    },
  });
}
