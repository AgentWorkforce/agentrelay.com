import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LoginPage from '../../app/login/page';
import { authErrorMessage, signInHref } from '../login';

const render = async (params: Record<string, string>) =>
  renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(params) }));

describe('login page', () => {
  it('signs in through Cloud’s Google and Microsoft routes, carrying the destination', async () => {
    const html = await render({ next: '/dashboard/workflows' });
    expect(html).toContain('Sign in to Agent Relay');
    expect(html).toContain('href="/cloud/api/auth/google/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('href="/cloud/api/auth/microsoft/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('Continue with Microsoft');
  });

  it('acknowledges an invite and forwards its token to every provider', async () => {
    const html = await render({ invite: ' abc123 ' });
    expect(html).toContain('You’ve been invited to a workspace');
    expect(html).toContain('/cloud/api/auth/google/start?invite_token=abc123');
    expect(html).toContain('/cloud/api/auth/microsoft/start?invite_token=abc123');
  });

  it('announces known OAuth errors and ignores unknown codes', async () => {
    expect(await render({ authError: 'state' })).toMatch(
      /role="alert"[^>]*>Your sign-in session expired/,
    );
    expect(await render({ authError: 'microsoft' })).toMatch(
      /role="alert"[^>]*>We couldn’t complete Microsoft sign-in/,
    );
    expect(await render({ authError: '<script>' })).not.toContain('role="alert"');
  });

  it('shows every agent it works with', async () => {
    const html = await render({});
    expect(html).toContain('Works with all your agents');
    for (const label of ['Claude', 'Codex', 'OpenCode', 'Gemini', 'Copilot', 'Cursor', 'Grok', 'Muse']) {
      expect(html).toContain(`title="${label}"`);
    }
  });

  it('links legal pages and the marketing home', async () => {
    const html = await render({});
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('New to Agent Relay?');
  });
});

describe('signInHref', () => {
  it('omits empty params', () => {
    expect(signInHref('google', {})).toBe('/cloud/api/auth/google/start');
    expect(signInHref('microsoft', {})).toBe('/cloud/api/auth/microsoft/start');
  });
});

describe('authErrorMessage', () => {
  it('returns null without a code or for inherited keys', () => {
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage('constructor')).toBeNull();
  });
});
