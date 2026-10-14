import { teamsCloudUrl } from './teams-cloud';

/** Messages for the `authError` codes Cloud's Google callback redirects with. */
const AUTH_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  state: 'Your sign-in session expired. Please try again.',
  google: 'We couldn’t complete Google sign-in. Please try again.',
  schema: 'Sign-in is temporarily unavailable. Please try again shortly.',
  unverified_email:
    'Google did not provide a verified email address. Use a Google account with a verified email and try again.',
};

export function authErrorMessage(code: string | undefined): string | null {
  return code && Object.hasOwn(AUTH_ERROR_MESSAGES, code) ? AUTH_ERROR_MESSAGES[code] : null;
}

/**
 * Cloud's Google start route owns validation: it normalizes `next` to a local
 * Cloud path and the invite token to its canonical form, so both pass through.
 */
export function googleSignInHref({
  next,
  invite,
}: {
  next?: string;
  invite?: string;
}): string {
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  if (invite) params.set('invite_token', invite);
  const query = params.toString();
  return teamsCloudUrl(`/api/auth/google/start${query ? `?${query}` : ''}`);
}
