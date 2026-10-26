import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import LoginPage from '../../app/login/page';
import { authErrorMessage, googleSignInHref, microsoftSignInHref } from '../login';

const render = async (params: Record<string, string>) =>
  renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve(params) }));

describe('login page', () => {
  it('signs in through Cloud’s Google route without a Microsoft button by default', async () => {
    const html = await render({ next: '/dashboard/workflows' });
    expect(html).toContain('Sign in to Agent Relay');
    expect(html).toContain('href="/cloud/api/auth/google/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('Continue with Google');
    expect(html).not.toContain('Continue with Microsoft');
    expect(html).not.toContain('/cloud/api/auth/microsoft/start');
  });

  it('renders the Microsoft button with ?microsoft=true, carrying the destination', async () => {
    const html = await render({ microsoft: 'true', next: '/dashboard/workflows' });
    expect(html).toContain('href="/cloud/api/auth/google/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('Continue with Google');
    expect(html).toContain('href="/cloud/api/auth/microsoft/start?next=%2Fdashboard%2Fworkflows"');
    expect(html).toContain('Continue with Microsoft');
  });

  it('does not render the Microsoft button unless microsoft is exactly "true"', async () => {
    for (const microsoft of ['false', '1', 'TRUE']) {
      const html = await render({ microsoft });
      expect(html, `microsoft=${microsoft}`).toContain('Continue with Google');
      expect(html, `microsoft=${microsoft}`).not.toContain('Continue with Microsoft');
      expect(html, `microsoft=${microsoft}`).not.toContain('/cloud/api/auth/microsoft/start');
    }
  });

  it('acknowledges an invite and forwards its token to both providers', async () => {
    const html = await render({ invite: ' abc123 ', microsoft: 'true' });
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
