import type { ApiResponse } from '../../shared/types/http';
import { httpClient, unwrapResponse } from './api';

export const assetStatuses = ['operational', 'maintenance', 'down', 'retired', 'decommissioned'] as const;

export type AssetStatus = (typeof assetStatuses)[number];

export interface AssetRecord {
  id: string;
  code: string;
  name: string;
  status: AssetStatus;
  location: string | null;
  category: string | null;
  purchaseDate: string | null;
  cost: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetListMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AssetsResponse {
  assets: AssetRecord[];
  meta: AssetListMeta;
}

export interface AssetQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: AssetStatus | '';
  location?: string;
  category?: string;
  sort?: string;
}

export interface SaveAssetPayload {
  name: string;
  code: string;
  status: AssetStatus;
  location?: string;
  category?: string;
  purchaseDate?: string;
  cost?: number;
}

export interface ImportAssetsPayload {
  assets: SaveAssetPayload[];
}

function withCleanParams(params: AssetQuery): Record<string, string | number | undefined> {
  const entries = Object.entries(params).filter(([, value]) => {
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return false;
    }

    return true;
  });

  return Object.fromEntries(entries) as Record<string, string | number | undefined>;
}

export async function listAssets(query: AssetQuery): Promise<AssetsResponse> {
  return unwrapResponse(
    httpClient.get<ApiResponse<AssetsResponse>>('/assets', {
      params: withCleanParams(query),
    }),
  );
}

export async function getAsset(id: string): Promise<AssetRecord> {
  const response = await unwrapResponse<{ asset: AssetRecord }>(
    httpClient.get<ApiResponse<{ asset: AssetRecord }>>(`/assets/${id}`),
  );

  return response.asset;
}

export async function createAsset(payload: SaveAssetPayload): Promise<AssetRecord> {
  const response = await unwrapResponse<{ asset: AssetRecord }>(
    httpClient.post<ApiResponse<{ asset: AssetRecord }>>('/assets', payload),
  );

  return response.asset;
}

export async function updateAsset(id: string, payload: Partial<SaveAssetPayload>): Promise<AssetRecord> {
  const response = await unwrapResponse<{ asset: AssetRecord }>(
    httpClient.put<ApiResponse<{ asset: AssetRecord }>>(`/assets/${id}`, payload),
  );

  return response.asset;
}

export async function deleteAsset(id: string): Promise<AssetRecord> {
  const response = await unwrapResponse<{ asset: AssetRecord }>(
    httpClient.delete<ApiResponse<{ asset: AssetRecord }>>(`/assets/${id}`),
  );

  return response.asset;
}

export async function importAssets(payload: ImportAssetsPayload): Promise<AssetRecord[]> {
  const response = await unwrapResponse<{ assets: AssetRecord[] }>(
    httpClient.post<ApiResponse<{ assets: AssetRecord[] }>>('/assets/import', payload),
  );

  return response.assets;
}

export async function exportAssets(query: AssetQuery): Promise<Blob> {
  const { data } = await httpClient.get<Blob>('/assets/export', {
    params: withCleanParams(query),
    responseType: 'blob',
  });

  return data;
}
