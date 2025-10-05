import { expect, test } from '@playwright/test';
import { setupAssetsApi } from './utils/assetApi';

test.describe('Assets experience', () => {
  test('supports discovery, lifecycle management, imports/exports, and offline queues', async ({ page }) => {
    const api = await setupAssetsApi(page);

    await page.goto('/assets');

    await expect(page.getByText('Main Pump')).toBeVisible();

    const catalogSearch = page.getByTestId('asset-search-input');
    await catalogSearch.fill('compressor');
    await expect(page.getByText('Line Compressor')).toBeVisible();
    await expect(page.locator('[data-testid="asset-row-edit-asset-1"]')).toHaveCount(0);

    await catalogSearch.fill('');
    await expect(page.locator('[data-testid="asset-row-edit-asset-1"]')).toHaveCount(1);

    await page.getByTestId('asset-filter-status').selectOption('maintenance');
    await expect(page.getByText('Packaging Robot')).toBeVisible();
    await expect(page.locator('[data-testid="asset-row-edit-asset-1"]')).toHaveCount(0);

    await page.getByTestId('asset-filter-location').fill('Line 2');
    await expect(page.getByText('Line Compressor')).toBeVisible();

    await page.getByTestId('asset-filter-status').selectOption('');
    await page.getByTestId('asset-filter-location').fill('');

    const hierarchyAsset = page.getByRole('button', { name: 'CMP-200 · Line Compressor' });
    await hierarchyAsset.click();
    await expect(hierarchyAsset).toHaveClass(/bg-brand/);

    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await page.getByTestId('asset-pagination-next').click();
    await expect(page.getByText('Cooling Tower')).toBeVisible();
    await page.getByTestId('asset-pagination-prev').click();
    await expect(page.getByText('Main Pump')).toBeVisible();

    const templateContents = await api.downloadTemplate(page);
    expect(templateContents).toContain('Asset name');
    expect(api.templateDownloads).toBe(1);

    await api.requestExport(page, 'csv');
    await api.requestExport(page, 'xlsx');
    expect(api.exportCounts.csv).toBe(1);
    expect(api.exportCounts.xlsx).toBe(1);

    const imported = await api.importAssets(page, [
      {
        code: 'IMP-900',
        name: 'Imported Pump',
        status: 'operational',
        location: 'Remote Site',
        category: 'Imported',
      },
    ]);
    await page.reload();
    const importedId = imported.at(0)?.id;
    if (importedId) {
      await expect(page.getByTestId(`asset-row-edit-${importedId}`)).toBeVisible();
    } else {
      await expect(page.getByText('Imported Pump')).toBeVisible();
    }

    await page.getByTestId('asset-toolbar-create').click();
    await page.getByTestId('asset-form-name').fill('Conveyor Prime');
    await page.getByTestId('asset-form-code').fill('CON-500');
    await page.getByTestId('asset-form-location').fill('Line 1');
    await page.getByTestId('asset-form-category').fill('Conveyance');
    await page.getByTestId('asset-form-cost').fill('9000');
    await page.getByTestId('asset-form-purchaseDate').fill('2024-03-01');
    await page.getByTestId('asset-form-submit').click();
    await expect(page.getByText('Conveyor Prime')).toBeVisible();
    await expect(page.getByRole('status', { name: /Asset created/i })).toBeVisible();

    const createdId = api.getAssetIdByCode('CON-500');
    expect(createdId).toBeDefined();

    if (createdId) {
      await page.getByTestId(`asset-row-edit-${createdId}`).click();
      await page.getByTestId('asset-form-location').fill('Line 4');
      await page.getByTestId('asset-form-submit').click();
      await expect(page.getByRole('status', { name: /Asset updated/i })).toBeVisible();
      await expect(page.getByText('Line 4')).toBeVisible();

      await page.getByTestId(`asset-row-delete-${createdId}`).click();
      await expect(page.getByRole('status', { name: /Asset deleted/i })).toBeVisible();
      await expect(page.locator(`[data-testid="asset-row-edit-${createdId}"]`)).toHaveCount(0);
    }

    api.goOfflineNext('create');
    await page.getByTestId('asset-toolbar-create').click();
    await page.getByTestId('asset-form-name').fill('Offline Valve');
    await page.getByTestId('asset-form-code').fill('OFF-777');
    await page.getByTestId('asset-form-location').fill('Boiler Room');
    await page.getByTestId('asset-form-category').fill('Steam');
    await page.getByTestId('asset-form-submit').click();
    await expect(page.getByRole('status', { name: /Unable to create asset/i })).toBeVisible();
    await page.getByTestId('asset-form-cancel').click();

    const queued = api.flushQueuedMutations();
    const offlineAsset = queued.find((asset) => asset.code === 'OFF-777');
    expect(offlineAsset).toBeDefined();

    await page.reload();
    if (offlineAsset) {
      await expect(page.getByTestId(`asset-row-edit-${offlineAsset.id}`)).toBeVisible();
    } else {
      await expect(page.getByText('Offline Valve')).toBeVisible();
    }
  });
});
