import { test, expect } from '@playwright/test';

test('project picker renders form fields', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Annual Photo Album & Calendar/ })).toBeVisible();
  await expect(page.getByPlaceholder(/2025 family album/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Choose/ })).toBeVisible();
});
