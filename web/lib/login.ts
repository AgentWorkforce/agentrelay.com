import { teamsCloudUrl } from './teams-cloud';

/** The sign-in providers Cloud offers; `authProvider` names the one an error is about. */
export const SIGN_IN_PROVIDERS = ['google', 'microsoft'] as const;
export type SignInProvider = (typeof SIGN_IN_PROVIDERS)[number];

const PROVIDER_LABELS: Readonly<Record<SignInProvider, string>> = {
  google: 'Google',
  microsoft: 'Microsoft',
};

export function signInProviderLabel(provider: SignInProvider): string {
  return PROVIDER_LABELS[provider];
}

function isSignInProvider(value: string | undefined): value is SignInProvider {
  return !!value && (SIGN_IN_PROVIDERS as readonly string[]).includes(value);
}

/** Messages for the `authError` codes Cloud's OAuth callbacks redirect with. */
const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  state: 'Your sign-in session expired. Please try again.',
  google: 'We couldn’t complete Google sign-in. Please try again.',
  microsoft: 'We couldn’t complete Microsoft sign-in. Please try again.',
  schema: 'Sign-in is temporarily unavailable. Please try again shortly.',
};

/**
 * Codes shared across providers; Cloud names the provider in `authProvider`.
 * Without one, the message falls back to Google, the provider that reported
 * these codes before `authProvider` existed.
 */
const PROVIDER_ERROR_MESSAGES: Readonly<Record<string, (provider: string) => string>> = {
  unverified_email: (provider) =>
    `${provider} did not provide a verified email address. Use a ${provider} account with a verified email and try again.`,
};

export function authErrorMessage(code: string | undefined, provider?: string): string | null {
  if (!code) return null;
  if (Object.hasOwn(PROVIDER_ERROR_MESSAGES, code)) {
    const label = isSignInProvider(provider) ? PROVIDER_LABELS[provider] : PROVIDER_LABELS.google;
    return PROVIDER_ERROR_MESSAGES[code](label);
  }
  return Object.hasOwn(AUTH_ERROR_MESSAGES, code) ? AUTH_ERROR_MESSAGES[code] : null;
}

/**
 * Cloud's provider start routes own validation: each normalizes `next` to a
 * local Cloud path and the invite token to its canonical form, so both pass
 * through.
 */
export function signInHref(
  provider: SignInProvider,
  { next, invite }: { next?: string; invite?: string },
): string {
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  if (invite) params.set('invite_token', invite);
  const query = params.toString();
  return teamsCloudUrl(`/api/auth/${provider}/start${query ? `?${query}` : ''}`);
}

export function googleSignInHref(options: { next?: string; invite?: string }): string {
  return signInHref('google', options);
}

export function microsoftSignInHref(options: { next?: string; invite?: string }): string {
  return signInHref('microsoft', options);
}
