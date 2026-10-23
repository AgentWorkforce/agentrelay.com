export function teamsCloudUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_CLOUD_URL || '/cloud').replace(/\/$/, '')}${path}`;
}

/**
 * Google sign-up that lands on the connect-your-agents page. `placement` names
 * the CTA in `utm_content`, so click analytics can tell the buttons apart.
 */
export function teamsGoogleAuthHref(placement: string): string {
  const params = new URLSearchParams({ source: 'teams', next: '/teams/connect', utm_content: placement });
  return teamsCloudUrl(`/api/auth/google/start?${params.toString()}`);
}
