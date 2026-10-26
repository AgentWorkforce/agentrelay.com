import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LoginPage from '../../app/login/page';
import s from '../../app/login/login.module.css';
import { authErrorMessage, googleSignInHref, microsoftSignInHref } from '../login';

const render = async (params: Record<string, string>) =>
  renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(params) }));

/** The class attribute of the sign-in link for `provider`. */
const providerClasses = (html: string, provider: string) => {
  const match = html.match(
    new RegExp(`<a href="/cloud/api/auth/${provider}/start[^"]*" class="([^"]*)"`),
  );
  expect(match, `${provider} sign-in link`).not.toBeNull();
  return match![1].split(' ');
};

describe('login page', () => {
  it('signs in through Cloud’s Google and Microsoft routes, carrying the destination', async () => {
    const html = await render({ next: '/dashboard/workflows' });
    expect(html).toContain('Sign in to Agent Relay');
    expect(html).toContain('href="/cloud/api/auth/google/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('href="/cloud/api/auth/microsoft/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('Continue with Microsoft');
  });

  it('hides the Microsoft button unless ?microsoft=true', async () => {
    expect(s.hidden).toBeTruthy();
    const hiddenParams: Record<string, string>[] = [
      {},
      { microsoft: 'false' },
      { microsoft: '1' },
      { microsoft: 'TRUE' },
    ];
    for (const params of hiddenParams) {
      const html = await render(params);
      expect(providerClasses(html, 'microsoft')).toContain(s.hidden);
      expect(providerClasses(html, 'google')).not.toContain(s.hidden);
    }
    const shown = await render({ microsoft: 'true' });
    expect(providerClasses(shown, 'microsoft')).not.toContain(s.hidden);
    expect(providerClasses(shown, 'microsoft')).toContain(s.provider);
    expect(providerClasses(shown, 'google')).not.toContain(s.hidden);
  });

  it('acknowledges an invite and forwards its token to both providers', async () => {
    const html = await render({ invite: ' abc123 ' });
    expect(html).toContain('You’ve been invited to a workspace');
    expect(html).toContain('href="/cloud/api/auth/google/start?invite_token=abc123"');
    expect(html).toContain('href="/cloud/api/auth/microsoft/start?invite_token=abc123"');
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

  it('names the provider that withheld a verified email, defaulting to Google', async () => {
    expect(await render({ authError: 'unverified_email', authProvider: 'microsoft' })).toMatch(
      /role="alert"[^>]*>Microsoft did not provide a verified email address\. Use a Microsoft account/,
    );
    expect(await render({ authError: 'unverified_email' })).toMatch(
      /role="alert"[^>]*>Google did not provide a verified email address/,
    );
    expect(await render({ authError: 'unverified_email', authProvider: 'okta' })).toMatch(
      /role="alert"[^>]*>Google did not provide a verified email address/,
    );
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

describe('sign-in hrefs', () => {
  it('omit empty params', () => {
    expect(googleSignInHref({})).toBe('/cloud/api/auth/google/start');
    expect(microsoftSignInHref({})).toBe('/cloud/api/auth/microsoft/start');
  });
});

describe('authErrorMessage', () => {
  it('returns null without a code or for inherited keys', () => {
    expect(authErrorMessage(undefined)).toBeNull();
    expect(authErrorMessage('constructor')).toBeNull();
    expect(authErrorMessage('constructor', 'microsoft')).toBeNull();
    expect(authErrorMessage('unverified_email', 'constructor')).toContain('Google did not');
  });
});
