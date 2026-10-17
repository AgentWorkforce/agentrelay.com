import { expect, test, type Page } from '@playwright/test';

const id = '537e4857-5590-42e8-8731-66441b466542';
const token = 'a'.repeat(64);
const initial = (product = 'teams') => ({ id, product, step: 0, state: 'waiting', revision: 0, updatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7200000).toISOString() });
async function mockSession(page: Page, getProgress: () => ReturnType<typeof initial>) {
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => {
    const create = route.request().method() === 'POST';
    return route.fulfill({ status: create ? 201 : 200, json: create ? { ...getProgress(), writeToken: token } : { ...getProgress(), id: new URL(route.request().url()).pathname.split('/').pop() } });
  });
}

test('prepares and restores a prompt without any session API requests', async ({ page }) => {
  let requests = 0;
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => {
    requests++;
    return route.fulfill({ status: 503, json: { error: 'unavailable' } });
  });
  await page.clock.install();
  await page.goto('/signup/with-agent');
  const button = page.getByRole('button', { name: 'Copy setup prompt' });
  await expect(button).toBeVisible();
  await expect(button.locator('..')).toHaveCSS('animation-name', 'none');
  const session = new URL(page.url()).searchParams.get('session');
  expect(session).toBeTruthy();
  await page.clock.fastForward(10_000);
  expect(requests).toBe(0);
  await page.reload();
  await expect(button).toBeVisible();
  expect(new URL(page.url()).searchParams.get('session')).toBe(session);
  expect(requests).toBe(0);
});

test('homepage opens the ready session-bound prompt without an introduction delay', async ({ page }, testInfo) => {
  await mockSession(page, () => initial());
  await page.goto('/');
  await page.getByRole('link', { name: 'Connect your agents for free', exact: true }).first().click();
  await expect(page).toHaveURL(/\/signup\/with-agent(?:\?|$)/);
  await expect(page.getByRole('heading', { name: 'Sign up for Agent Relay.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Setup details')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('oracle-ready.png'), animations: 'disabled' });
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true }));
  await page.getByRole('button', { name: 'Copy setup prompt' }).click();
  const prompt = page.getByRole('textbox', { name: 'Agent signup prompt' });
  await expect(prompt).toBeVisible();
  expect(await prompt.inputValue()).toContain('/signup/agent/teams');
  expect(await prompt.inputValue()).toContain(`Progress session: ${new URL(page.url()).searchParams.get('session')}`);
  await expect.poll(() => prompt.evaluate(el => (el as HTMLTextAreaElement).selectionEnd - (el as HTMLTextAreaElement).selectionStart)).toBe((await prompt.inputValue()).length);
});

test('copy launches the artwork but only agent reports advance setup', async ({ page }, testInfo) => {
  let progress = initial();
  await mockSession(page, () => progress);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/signup/with-agent');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }));
  await page.getByRole('button', { name: 'Copy setup prompt' }).click();
  await expect(page.getByRole('heading', { name: 'Now paste it into your agent.' })).toBeVisible();
  await expect(page.locator('[data-scene="launch"]')).toBeVisible();
  const session = new URL(page.url()).searchParams.get('session');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Now paste it into your agent.' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('session')).toBe(session);
  progress = { ...progress, step: 1, state: 'waiting', revision: 1 };
  await expect(page.getByRole('heading', { name: 'Finish signing in.' })).toBeVisible();
  progress = { ...progress, step: 2, state: 'working', revision: 2 };
  await expect(page.getByRole('heading', { name: 'Installing the desktop app.' })).toBeVisible();
  const canvas = page.locator('canvas');
  const before = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL())).toBe(before);
  progress = { ...progress, step: 5, state: 'working', revision: 3 };
  await expect(page.getByRole('heading', { name: 'Checking your connection.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enter the relay' })).toHaveCount(0);
  progress = { ...progress, state: 'complete', revision: 4 };
  await expect(page.getByRole('heading', { name: 'Your setup is complete.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enter the relay' })).toHaveAttribute('href', /\/cloud\/dashboard\/sessions$/);
  await page.screenshot({ path: testInfo.outputPath('oracle-complete.png') });
});

test('existing session read failures support retry', async ({ page }) => {
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => route.fulfill({ status: 503, json: { error: 'unavailable' } }));
  await page.goto(`/signup/with-agent?session=${id}`);
  await expect(page.getByRole('heading', { name: 'Setup is temporarily unavailable.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toHaveCount(0);
  await page.unroute('**/cloud/api/v1/signup/agent/sessions**');
  await mockSession(page, () => initial());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Waiting for your agent.' })).toBeVisible();
});

test('watcher links redirect with their session without exposing a prompt', async ({ page }) => {
  await mockSession(page, () => initial());
  await page.goto(`/signup/teams?session=${id}`);
  await expect(page).toHaveURL(new RegExp(`/signup/with-agent\\?session=${id}`));
  await expect(page.getByRole('heading', { name: 'Waiting for your agent.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toHaveCount(0);
});

test('flow questions remain usable and clear when progress advances', async ({ page }) => {
  let progress = { ...initial('flows'), inputRequest: { id, key: 'repository', label: 'Which repository?', type: 'text', status: 'pending', step: 0 } };
  await mockSession(page, () => progress);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ session, secret }) => sessionStorage.setItem('agent-relay-signup:flows', JSON.stringify({ ...session, writeToken: secret })), { session: initial('flows'), secret: token });
  await page.goto('/signup/flows');
  await expect(page.getByRole('heading', { name: 'Your agent needs an answer.' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Which repository?' })).toBeVisible();
  progress = { ...progress, revision: 1, inputRequest: { ...progress.inputRequest, status: 'answered' } };
  await expect(page.getByRole('heading', { name: 'Your answer has been sent.' })).toBeVisible();
  progress = { ...progress, step: 2, state: 'working', revision: 2 };
  await expect(page.getByRole('heading', { name: 'Choose your workflow.' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Question from your agent' })).toHaveCount(0);
});


test('mobile keeps the oracle and prompt in view and supports pausing motion', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockSession(page, () => initial());
  await page.goto('/signup/with-agent');
  const button = page.getByRole('button', { name: 'Copy setup prompt' });
  await expect(button).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Pause motion' }).click();
  await expect(page.getByRole('button', { name: 'Resume motion' })).toHaveAttribute('aria-pressed', 'true');
  const bounds = await button.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath('oracle-mobile.png'), animations: 'disabled' });

});

test('copy waits through an unregistered session and recovers after the agent starts', async ({ page }) => {
  let active = false;
  let reads = 0;
  const writes: string[] = [];
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => {
    if (route.request().method() !== 'GET') writes.push(route.request().method());
    reads++;
    return route.fulfill(active
      ? { status: 200, json: { ...initial(), id: new URL(route.request().url()).pathname.split('/').pop(), step: 1, state: 'working', revision: 1 } }
      : { status: 404, json: { error: 'session_not_found' } });
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/signup/with-agent');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true }));
  await page.getByRole('button', { name: 'Copy setup prompt' }).click();
  await expect.poll(() => reads).toBeGreaterThanOrEqual(2);
  await expect(page.getByRole('heading', { name: 'Now paste it into your agent.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Now paste it into your agent.' })).toBeVisible();
  active = true;
  await expect(page.getByRole('heading', { name: 'Preparing sign-in.' })).toBeVisible();
  expect(writes).toEqual([]);
  expect(new URL(page.url()).searchParams.has('expires')).toBe(false);
});

test('an unregistered shared link waits read-only and an expired local prompt can restart', async ({ page }) => {
  await page.route('**/cloud/api/v1/signup/agent/sessions**', route => route.fulfill({ status: 404, json: { error: 'session_not_found' } }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/signup/with-agent?session=${id}&expires=${encodeURIComponent(new Date(Date.now() + 60_000).toISOString())}`);
  await expect(page.getByRole('heading', { name: 'Waiting for your agent.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toHaveCount(0);
  await page.goto(`/signup/with-agent?session=${id}&expires=${encodeURIComponent(new Date(Date.now() - 1000).toISOString())}`);
  await expect(page.getByRole('heading', { name: 'Your signup session expired.' })).toBeVisible();
  await page.getByRole('button', { name: 'Start signup again' }).click();
  await expect(page.getByRole('button', { name: 'Copy setup prompt' })).toBeVisible();
  expect(new URL(page.url()).searchParams.get('session')).not.toBe(id);
});
