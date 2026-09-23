import { expect, test } from '@playwright/test';

const id = '537e4857-5590-42e8-8731-66441b466542';
const token = 'a'.repeat(64);

test('agent signup stays still until reported progress, restores its session, and supports reduced motion', async ({ page }) => {
  let creates = 0;
  let progress = { id, product: 'teams', step: 0, state: 'waiting', revision: 0, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString() };
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => {
    const create = route.request().method() === 'POST';
    if (create) creates++;
    return route.fulfill({ status: create ? 201 : 200, json: create ? {...progress, writeToken: token} : progress });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/signup/teams');
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toBeEnabled();
  await expect(page.getByText('Ready when your agent is')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`session=${id}`));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toBeEnabled();
  expect(creates).toBe(1);
  const canvas = page.locator('canvas');
  await expect.poll(() => canvas.evaluate(el => (el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  // Frames must remain identical when the OS requests reduced motion.
  const before = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL())).toBe(before);
  progress = {...progress, step: 1, state: 'waiting', revision: 1};
  await expect(page.getByRole('heading', { name: 'A quick approval from you.' })).toBeVisible();
  await expect(page.getByText('1 of 5 · Waiting for your approval')).toBeVisible();
  progress = {...progress, step: 2, state: 'working', revision: 2};
  await expect(page.getByRole('heading', { name: 'Install the app', exact: true })).toBeVisible();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const reducedFrame = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL())).toBe(reducedFrame);
  progress = {...progress, step: 5, state: 'complete', revision: 6};
  await expect(page.getByRole('heading', { name: 'All yours.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open your workspace' })).toHaveAttribute('href', /\/cloud\/dashboard\/sessions$/);
});

test('clipboard failure reveals and selects the entire prompt', async ({ page }) => {
  const progress = { id, product: 'flows', step: 0, state: 'waiting', revision: 0, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString() };
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => route.fulfill({status: route.request().method() === 'POST' ? 201 : 200, json: {...progress, writeToken: token}}));
  await page.goto('/signup/flows');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }));
  await page.getByRole('button', { name: 'Copy setup prompt' }).click();
  const prompt = page.getByRole('textbox', { name: 'Agent signup prompt' });
  await expect(prompt).toBeVisible();
  await expect.poll(() => prompt.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBe((await prompt.inputValue()).length);
  expect(await prompt.inputValue()).toContain('/signup/agent/flows');
});

test('logo ribbons respond to pointer movement and settle into the completed mark', async ({ page }, testInfo) => {
  let progress = { id, product: 'teams', step: 0, state: 'waiting', revision: 0, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString() };
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => route.fulfill({ status: route.request().method() === 'POST' ? 201 : 200, json: route.request().method() === 'POST' ? {...progress, writeToken: token} : progress }));
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.goto('/signup/teams');
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toBeEnabled();
  const canvas = page.locator('canvas');
  await expect.poll(() => canvas.evaluate(el => (el as HTMLCanvasElement).width)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath('signup-logo-waiting.png') });
  await page.mouse.move(340, 220);
  await page.mouse.move(580, 300, { steps: 10 });
  await page.screenshot({ path: testInfo.outputPath('signup-logo-swish.png') });
  await page.mouse.move(20, 850);
  progress = {...progress, step: 5, state: 'working', revision: 5};
  await expect(page.getByRole('heading', { name: 'Check everything works' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('signup-logo-verifying.png') });
  progress = {...progress, state: 'complete', revision: 6};
  await expect(page.getByRole('heading', { name: 'All yours.' })).toBeVisible();
  // Completion should reveal a filled left facet, not leave a hollow ribbon.
  await expect.poll(() => canvas.evaluate(el => {
    const c = el as HTMLCanvasElement;
    const context = c.getContext('2d')!;
    const ratio = c.width / c.clientWidth;
    return context.getImageData(Math.round(400 * ratio), Math.round(260 * ratio), 1, 1).data[3];
  }), { timeout: 15000 }).toBeGreaterThan(180);
  await page.screenshot({ path: testInfo.outputPath('signup-logo-complete.png') });
});
