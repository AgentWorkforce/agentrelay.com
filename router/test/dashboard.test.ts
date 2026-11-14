import {describe, expect, it, vi} from 'vitest';
import worker from '../index.js';
const ctx = {waitUntil: vi.fn()} as unknown as ExecutionContext;
const request = (path: string, method = 'GET') => new Request(`https://agentrelay.com${path}`, {method, headers:{cookie:'session=private',authorization:'Bearer private'}});
it('routes only dashboard assets to the SPA, without authentication credentials', async () => {
  const fetch = vi.fn(async (_request: Request) => new Response('asset'));
  const env = {DASHBOARD_ASSETS:{fetch}} as unknown as Parameters<typeof worker.fetch>[1];
  const response = await worker.fetch(request('/dashboard/assets/main.js?v=1'),env,ctx);
  expect(await response.text()).toBe('asset');
  const sent = fetch.mock.calls[0][0] as Request;
  expect(sent.url).toBe('https://agentrelay.com/assets/main.js?v=1');
  expect(sent.headers.has('cookie')).toBe(false);
  expect(sent.headers.has('authorization')).toBe(false);
});
describe('dashboard routing boundary', () => {
  it('canonicalizes the root and refuses writes', async () => {
    const fetch = vi.fn(); const env = {DASHBOARD_ASSETS:{fetch}} as unknown as Parameters<typeof worker.fetch>[1];
    expect((await worker.fetch(request('/dashboard?x=1'),env,ctx)).headers.get('location')).toBe('https://agentrelay.com/dashboard/?x=1');
    expect((await worker.fetch(request('/dashboard/', 'POST'),env,ctx)).status).toBe(405);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not fall through to marketing when the SPA binding is missing', async () => {
    expect((await worker.fetch(request('/dashboard/'),{} as Parameters<typeof worker.fetch>[1],ctx)).status).toBe(503);
  });
});
