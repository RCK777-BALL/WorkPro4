import { expect, test } from '@playwright/test';

interface TestAsset {
  id: string;
  code: string;
  name: string;
  status: 'operational' | 'maintenance' | 'down' | 'retired' | 'decommissioned';
  location: string | null;
  category: string | null;
  purchaseDate: string | null;
  cost: number | null;
  createdAt: string;
  updatedAt: string;
}

test.describe('Assets flow', () => {
  test.beforeEach(async ({ page }) => {
    const now = new Date().toISOString();
    const assets: TestAsset[] = [
      {
        id: 'asset-1',
        code: 'PUMP-001',
        name: 'Main Pump',
        status: 'operational',
        location: 'Plant 1',
        category: 'Utilities',
        purchaseDate: now,
        cost: 1500,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await page.addInitScript((state) => {
      window.localStorage.setItem(
        'auth-storage',
        JSON.stringify({ state: { user: state.user, isAuthenticated: true }, version: 0 }),
      );
      window.localStorage.setItem('auth_token', 'test-token');
    }, {
      user: {
        id: '1',
        tenantId: 'tenant-1',
        email: 'admin@example.com',
        name: 'Admin',
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      },
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          tenantId: 'tenant-1',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
          createdAt: now,
          updatedAt: now,
        }),
      });
    });

    const fulfillAssets = async (route: any) => {
      const url = new URL(route.request().url());
      const method = route.request().method();

      if (method === 'GET') {
        const pageParam = Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1;
        const pageSize = Number.parseInt(url.searchParams.get('pageSize') ?? '10', 10) || 10;
        const start = (pageParam - 1) * pageSize;
        const slice = assets.slice(start, start + pageSize);

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            assets: slice,
            meta: {
              page: pageParam,
              pageSize,
              total: assets.length,
              totalPages: Math.max(1, Math.ceil(Math.max(assets.length, 1) / pageSize)),
            },
          }),
        });
        return;
      }

      const body = route.request().postDataJSON?.();

      if (method === 'POST') {
        const created: TestAsset = {
          id: `asset-${assets.length + 1}`,
          code: body.code,
          name: body.name,
          status: body.status ?? 'operational',
          location: body.location ?? null,
          category: body.category ?? null,
          purchaseDate: body.purchaseDate ?? null,
          cost: body.cost ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        assets.unshift(created);
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, asset: created }),
        });
        return;
      }

      const id = url.pathname.split('/').pop() ?? '';
      const existingIndex = assets.findIndex((asset) => asset.id === id);
      if (existingIndex === -1) {
        await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ ok: false }) });
        return;
      }

      if (method === 'PUT') {
        const updated = {
          ...assets[existingIndex],
          ...body,
          location: body.location ?? null,
          category: body.category ?? null,
          purchaseDate: body.purchaseDate ?? null,
          cost: body.cost ?? null,
          updatedAt: new Date().toISOString(),
        } satisfies TestAsset;
        assets[existingIndex] = updated;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, asset: updated }),
        });
        return;
      }

      if (method === 'DELETE') {
        const removed = assets.splice(existingIndex, 1)[0];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ok: true, asset: removed }),
        });
        return;
      }

      await route.fallback();
    };

    await page.route('**/api/assets*', fulfillAssets);
  });

  test('can create, edit, and delete an asset', async ({ page }) => {
    await page.goto('/assets');

    await expect(page.getByText('Main Pump')).toBeVisible();

    await page.getByTestId('asset-toolbar-create').click();
    await page.getByTestId('asset-form-name').fill('Conveyor');
    await page.getByTestId('asset-form-code').fill('CON-100');
    await page.getByTestId('asset-form-location').fill('Plant 3');
    await page.getByTestId('asset-form-category').fill('Production');
    await page.getByTestId('asset-form-cost').fill('9000');
    await page.getByTestId('asset-form-purchaseDate').fill('2024-02-20');
    await page.getByTestId('asset-form-submit').click();

    await expect(page.getByText('Conveyor')).toBeVisible();

    await page.getByTestId('asset-row-edit-asset-2').click();
    await page.getByTestId('asset-form-location').fill('Plant 4');
    await page.getByTestId('asset-form-submit').click();

    await expect(page.getByText('Plant 4')).toBeVisible();

    await page.getByTestId('asset-row-delete-asset-2').click();
    await expect(page.getByText('Conveyor')).not.toBeVisible({ timeout: 5000 });
  });
});
