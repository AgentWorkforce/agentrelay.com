import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LoginPage from '../../app/login/page';
import { authErrorMessage, googleSignInHref } from '../login';

const render = async (params: Record<string, string>) =>
  renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(params) }));

describe('login page', () => {
  it('signs in through Cloud’s Google route, carrying the destination', async () => {
    const html = await render({ next: '/dashboard/workflows' });
    expect(html).toContain('Sign in to Agent Relay');
    expect(html).toContain('href="/cloud/api/auth/google/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('If you don’t have an account, we’ll make one for you.');
  });

  it('acknowledges an invite and forwards its token', async () => {
    const html = await render({ invite: ' abc123 ' });
    expect(html).toContain('You’ve been invited to a workspace');
    expect(html).toContain('invite_token=abc123');
  });

  it('announces known OAuth errors and ignores unknown codes', async () => {
    expect(await render({ authError: 'state' })).toMatch(
      /role="alert"[^>]*>Your sign-in session expired/,
    );
    expect(await render({ authError: '<script>' })).not.toContain('role="alert"');
  });

  it('shows the agents it works with and the sessions waiting on the visitor', async () => {
    const html = await render({});
    expect(html).toContain('Works with your agents');
    for (const label of ['Claude Code', 'Codex', 'OpenCode', 'Gemini', 'Copilot']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('needs a human');
  });

  it('links legal pages and the marketing home', async () => {
    const html = await render({});
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('New to Agent Relay?');
  });
});

describe('googleSignInHref', () => {
  it('omits empty params', () => {
    expect(googleSignInHref({})).toBe('/cloud/api/auth/google/start');
  });
});

describe('authErrorMessage', () => {
  it('returns null without a code or for inherited keys', () => {
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage('constructor')).toBeNull();
  });
});
