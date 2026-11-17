export const SITE_NAME = 'Agent Relay';
export const SITE_HOST = 'agentrelay.com';
export const SITE_URL = `https://${SITE_HOST}`;
export const SITE_EMAIL = 'hello@agentrelay.com';
export const DISCORD_URL = 'https://discord.gg/6E6CTxM8um';
export const POSTHOG_HOST = 'https://i.agentrelay.com';

export function absoluteUrl(path: string): string {
  return new URL(path.startsWith('/') ? path : `/${path}`, SITE_URL).toString();
}
