import { expect, test } from '@playwright/test';

test('Getting started is the docs entry point and old setup links still work', async ({ page, request }) => {
  for (const [source, destination] of [
    ['/docs/hacking', '/docs/getting-started'],
    ['/docs/8.0.0/hacking', '/docs/getting-started'],
    ['/docs/hacking.md', '/docs/markdown/getting-started.md'],
    ['/docs/markdown/hacking.md', '/docs/markdown/getting-started.md'],
    ['/docs/hacking/og.png', '/docs/getting-started/og.png'],
    ['/quickstart', '/docs/quickstart'],
  ]) {
    const response = await request.get(source, { maxRedirects: 0 });
    expect(response.status(), source).toBe(308);
    expect(new URL(response.headers().location, response.url()).pathname).toBe(destination);
  }

  await page.goto('/docs');
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Desktop setup', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/quickstart$/);
  await expect(page.getByRole('heading', { name: 'Desktop setup', exact: true })).toBeVisible();
  await expect(page.locator('article')).toContainText('The desktop app is optional.');
});

// Jumping to a heading, switching docs version, then pressing Back must bring
// back the page you jumped on, not leave the other version on screen.
test('Back after a TOC jump and a version switch restores the archived page', async ({ page }) => {
  await page.goto('/docs/7.1.1/channels');
  const version = page.getByLabel('Documentation version');
  await expect(version).toHaveValue('v7.1.1');

  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'When to use channels' }).click();
  await expect(page).toHaveURL(/\/docs\/7\.1\.1\/channels#when-to-use-channels$/);

  await version.selectOption('v8');
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
  await expect(version).toHaveValue('v8');

  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/7\.1\.1\/channels#when-to-use-channels$/);
  await expect(version).toHaveValue('v7.1.1');
  await expect(page.locator('article')).toContainText('Join channels on spawn');
});
