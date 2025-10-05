import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AxiosResponse } from 'axios';
import type { ApiResponse } from '../../shared/types/http';

function createAxiosResponse<T>(payload: ApiResponse<T>): AxiosResponse<ApiResponse<T>> {
  return {
    data: payload,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {},
  } as AxiosResponse<ApiResponse<T>>;
}

describe('assets api helpers', () => {
  let assetsModule: typeof import('./assets');
  let apiModule: typeof import('./api');

  beforeEach(async () => {
    vi.resetModules();
    apiModule = await import('./api');
    assetsModule = await import('./assets');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('lists assets with cleaned query parameters', async () => {
    const getSpy = vi
      .spyOn(apiModule.httpClient, 'get')
      .mockResolvedValue(
        createAxiosResponse({
          data: { assets: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
          error: null,
        }),
      );

    await assetsModule.listAssets({
      page: 2,
      pageSize: 25,
      search: 'pump',
      status: '',
      location: 'Plant 1',
      category: 'Utilities',
      sort: 'createdAt:desc',
    });

    expect(getSpy).toHaveBeenCalledWith('/assets', {
      params: {
        page: 2,
        pageSize: 25,
        search: 'pump',
        location: 'Plant 1',
        category: 'Utilities',
        sort: 'createdAt:desc',
      },
    });
  });

  it('creates an asset with the provided payload', async () => {
    const asset = {
      id: 'asset-1',
      code: 'PUMP-1',
      name: 'Pump',
      status: 'operational',
      location: 'Plant',
      category: 'Utilities',
      purchaseDate: new Date().toISOString(),
      cost: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    const postSpy = vi
      .spyOn(apiModule.httpClient, 'post')
      .mockResolvedValue(createAxiosResponse({ data: { asset }, error: null }));

    const payload = {
      name: 'Pump',
      code: 'PUMP-1',
      status: 'operational' as const,
      location: 'Plant',
      category: 'Utilities',
      purchaseDate: asset.purchaseDate,
      cost: 1000,
    };

    const result = await assetsModule.createAsset(payload);

    expect(postSpy).toHaveBeenCalledWith('/assets', payload);
    expect(result).toEqual(asset);
  });

  it('updates an asset by id', async () => {
    const asset = {
      id: 'asset-1',
      code: 'PUMP-1',
      name: 'Pump',
      status: 'operational',
      location: 'Plant',
      category: 'Utilities',
      purchaseDate: new Date().toISOString(),
      cost: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    const putSpy = vi
      .spyOn(apiModule.httpClient, 'put')
      .mockResolvedValue(createAxiosResponse({ data: { asset }, error: null }));

    const update = { name: 'Updated Pump', category: 'Maintenance' };
    const result = await assetsModule.updateAsset(asset.id, update);

    expect(putSpy).toHaveBeenCalledWith(`/assets/${asset.id}`, update);
    expect(result).toEqual(asset);
  });

  it('deletes an asset by id', async () => {
    const asset = {
      id: 'asset-1',
      code: 'PUMP-1',
      name: 'Pump',
      status: 'operational',
      location: 'Plant',
      category: 'Utilities',
      purchaseDate: new Date().toISOString(),
      cost: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    const deleteSpy = vi
      .spyOn(apiModule.httpClient, 'delete')
      .mockResolvedValue(createAxiosResponse({ data: { asset }, error: null }));

    const result = await assetsModule.deleteAsset(asset.id);

    expect(deleteSpy).toHaveBeenCalledWith(`/assets/${asset.id}`);
    expect(result).toEqual(asset);
  });

  it('imports assets in bulk', async () => {
    const asset = {
      id: 'asset-1',
      code: 'PUMP-1',
      name: 'Pump',
      status: 'operational',
      location: 'Plant',
      category: 'Utilities',
      purchaseDate: new Date().toISOString(),
      cost: 1000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as const;

    const postSpy = vi
      .spyOn(apiModule.httpClient, 'post')
      .mockResolvedValue(createAxiosResponse({ data: { assets: [asset] }, error: null }));

    const payload = {
      assets: [
        {
          name: 'Pump',
          code: 'PUMP-1',
          status: 'operational' as const,
        },
      ],
    };

    const result = await assetsModule.importAssets(payload);

    expect(postSpy).toHaveBeenCalledWith('/assets/import', payload);
    expect(result).toEqual([asset]);
  });

  it('exports assets as a blob', async () => {
    const blob = new Blob(['test'], { type: 'text/plain' });
    const getSpy = vi
      .spyOn(apiModule.httpClient, 'get')
      .mockResolvedValue({
        data: blob,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      } as AxiosResponse<Blob>);

    const result = await assetsModule.exportAssets({ search: 'pump', status: '' });

    expect(getSpy).toHaveBeenCalledWith('/assets/export', {
      params: { search: 'pump' },
      responseType: 'blob',
    });
    expect(result).toBe(blob);
  });
});
