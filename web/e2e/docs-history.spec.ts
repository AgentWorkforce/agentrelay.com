import { expect, test } from '@playwright/test';

test('Introduction redirects permanently while its detailed markdown exports remain available', async ({ page, request }) => {
  const response = await request.get('/docs/introduction?from=bookmark', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  const destination = new URL(response.headers().location, response.url());
  expect(destination.pathname).toBe('/docs/getting-started');
  expect(destination.searchParams.get('from')).toBe('bookmark');

  await page.goto('/docs/introduction');
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
  await expect(page.locator('a[href="/docs/introduction"]')).toHaveCount(0);

  const markdown = await request.get('/docs/markdown/introduction.md', { maxRedirects: 0 });
  expect(markdown.status()).toBe(200);
  expect(markdown.headers()['content-type']).toContain('text/markdown');
  const content = await markdown.text();
  expect(content).toContain('## CLI setup details');
  expect(content).toContain('### Session history and privacy');
  const alias = await request.get('/docs/introduction.md', { maxRedirects: 0 });
  expect(alias.status()).toBe(200);
  expect(await alias.text()).toBe(content);
  const bundle = await request.get('/llms-full.txt');
  expect(bundle.status()).toBe(200);
  expect(await bundle.text()).toContain('## CLI setup details');
});

test('Getting started leads with the free CLI and Quickstart opens the desktop upgrade', async ({ page, request }) => {
  const response = await request.get('/quickstart', { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(new URL(response.headers().location, response.url()).pathname).toBe('/docs/quickstart');

  await page.goto('/docs');
  await expect(page).toHaveURL(/\/docs\/getting-started$/);
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
  const article = page.locator('article');
  await expect(article).toContainText('Start free with the open-source CLI.');
  await expect(article.getByRole('heading', { level: 2 })).toHaveText(['Solo', 'Team', 'Talk']);
  await expect(article).toContainText('npx -y agent-relay@next init');
  await expect(article).toContainText("npx -y agent-relay@next init --key 'WORKSPACE_KEY'");
  await expect(article).toContainText('Share the line it prints privately, like a password.');
  await expect(article).not.toContainText('--yes');
  await expect(article).not.toContainText('--url');
  const details = article.getByRole('link', { name: 'Details and troubleshooting' });
  await expect(details).toHaveAttribute('href', '/docs/markdown/introduction.md');
  const markdown = await request.get('/docs/markdown/introduction.md');
  expect(markdown.headers()['content-type']).toContain('text/markdown');
  expect(await markdown.text()).toContain('### Which sessions join');
  const bundle = await request.get('/llms-full.txt');
  expect(await bundle.text()).toContain('### Session history and privacy');

  await expect(page.getByRole('link', { name: 'Desktop app (upgrade)', exact: true })).toBeVisible();
  await article.getByRole('link', { name: 'Upgrade to the paid Agent Relay desktop app', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/quickstart$/);
  await expect(page.getByRole('heading', { name: 'Desktop app', exact: true })).toBeVisible();
  await expect(page.locator('article')).toContainText('paid upgrade');
});

test('Back restores the shortened Getting started page and its Solo anchor', async ({ page }) => {
  await page.goto('/docs/getting-started');
  const version = page.getByLabel('Documentation version');
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'Solo', exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/getting-started#solo$/);
  await version.selectOption('v7.1.1');
  await expect(page).toHaveURL(/\/docs\/7\.1\.1\/introduction$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/docs\/getting-started#solo$/);
  await expect(version).toHaveValue('v8');
  await expect(page.getByRole('heading', { name: 'Getting started', exact: true })).toBeVisible();
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
