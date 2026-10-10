import { expect, test } from '@playwright/test';

test('late-mounted mobile CTA keeps the landing journey through Google auth', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/flows', { waitUntil: 'domcontentloaded' });

  // The mobile menu content is intentionally mounted only after this click.
  await page.getByRole('button', { name: 'Open menu' }).click();
  const cta = page.locator('#site-nav-mobile-menu a[data-flows-auth]');
  await expect(cta).toHaveCount(1);
  await expect.poll(async () => await cta.getAttribute('href')).toMatch(/journey_id=/);

  const href = new URL(await cta.getAttribute('href') ?? '', 'http://localhost:3100');
  const next = href.searchParams.get('next');
  expect(next).toMatch(/^\/flows\/deploy\?journey_id=[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i);
  expect(href.searchParams.get('utm_content')).toBe('mobile_nav');
});
