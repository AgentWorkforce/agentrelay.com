import { expect, test } from '@playwright/test';

// Jumping to a heading, switching docs version, then pressing Back must bring
// back the page you jumped on, not leave the other version on screen.
test('Back after a TOC jump and a version switch restores the archived page', async ({ page }) => {
  await page.goto('/docs/7.1.1/channels');
  const version = page.getByLabel('Documentation version');
  await expect(version).toHaveValue('v7.1.1');

  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'When to use channels' }).click();
  await expect(page).toHaveURL(/\/docs\/7\.1\.1\/channels#when-to-use-channels$/);

  await version.selectOption('v8');
  await expect(page).toHaveURL(/\/docs\/introduction$/);
  await expect(version).toHaveValue('v8');

  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/7\.1\.1\/channels#when-to-use-channels$/);
  await expect(version).toHaveValue('v7.1.1');
  await expect(page.locator('article')).toContainText('Join channels on spawn');
});
