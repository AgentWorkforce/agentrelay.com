import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { KeepInbox, keepInboxSignInHref, requestKeep } from '../../components/events-shim/KeepInbox';

const TOKEN = 'esk_0123456789abcdefghijklmnopqrstuvwxyzABCDEFG';

const answer = (status: number, body: unknown) => vi.fn(async () => Response.json(body, { status }));

describe('Keep this inbox', () => {
  it('sends the manage token with the session cookie to the claim route', async () => {
    const fetchImpl = answer(200, { claimed: 'workspace', message: 'The inbox and its Agent Relay workspace are now your account’s.' });
    const result = await requestKeep(TOKEN, fetchImpl as unknown as typeof fetch);
    expect(result).toEqual({ kind: 'kept', message: 'The inbox and its Agent Relay workspace are now your account’s.' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/events-shim\/shims\/current\/claim$/);
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(JSON.parse(String(init.body))).toEqual({ manage_token: TOKEN });
  });

  it('asks to sign in when there is no session, and explains a claim by someone else or a failure', async () => {
    expect(await requestKeep(TOKEN, answer(401, { error: 'unauthorized' }) as unknown as typeof fetch)).toEqual({ kind: 'sign-in' });
    expect(await requestKeep(TOKEN, answer(409, { error: 'claimed' }) as unknown as typeof fetch)).toEqual({
      kind: 'error',
      message: 'This inbox already belongs to another account.',
    });
    expect(await requestKeep(TOKEN, answer(503, {}) as unknown as typeof fetch)).toMatchObject({ kind: 'error' });
    const down = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    expect(await requestKeep(TOKEN, down as unknown as typeof fetch)).toMatchObject({ kind: 'error' });
  });

  it('signs up back to this page, where the inbox is kept', () => {
    const href = new URL(keepInboxSignInHref(), 'https://agentrelay.com');
    expect(href.pathname).toMatch(/\/api\/auth\/google\/start$/);
    expect(href.searchParams.get('next')).toBe('/mcp-events-shim?keep=1');
  });

  it('says what is temporary and offers to keep it, without putting the token in the page', () => {
    const html = renderToStaticMarkup(<KeepInbox manageToken={TOKEN} />);
    expect(html).toContain('Keep this inbox');
    expect(html).toContain('deleted after 7');
    expect(html).toContain('Keep it');
    expect(html).not.toContain(TOKEN);
  });
});
