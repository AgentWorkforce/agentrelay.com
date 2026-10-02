import { JOURNEY_ID_REGEX } from './flow-journey';

const DEFAULT_CLOUD_URL = '/cloud';
const GOOGLE_AUTH_PATH = '/api/auth/google/start';
const FLOWS_DEPLOY_PATH = '/flows/deploy';

function parseFlowsAuthHref(href: string): { url: URL; next: URL } | null {
  try {
    const url = new URL(href, 'https://agentrelay.invalid');
    if (!url.pathname.endsWith(GOOGLE_AUTH_PATH) || url.searchParams.get('source') !== 'flows') return null;
    const next = new URL(url.searchParams.get('next') ?? '', url.origin);
    if (next.origin !== url.origin || next.pathname !== FLOWS_DEPLOY_PATH) return null;
    return { url, next };
  } catch {
    return null;
  }
}

/** True only for the Flows auth link that returns to the fixed deploy route. */
export function isFlowsGoogleAuthHref(href: string): boolean {
  return parseFlowsAuthHref(href) !== null;
}

/**
 * Carry the landing journey through OAuth's opaque `next` handoff. Cloud keeps
 * that query across the Google round trip; no flow content or identity enters
 * the auth state or a server log outside the bounded journey UUID.
 */
export function withFlowsJourney(href: string, id: string): string {
  if (!JOURNEY_ID_REGEX.test(id)) return href;
  const parsed = parseFlowsAuthHref(href);
  if (!parsed) return href;
  parsed.next.searchParams.set('journey_id', id);
  parsed.url.searchParams.set('next', `${parsed.next.pathname}${parsed.next.search}${parsed.next.hash}`);
  const result = parsed.url.toString();
  return href.startsWith('/') && !href.startsWith('//')
    ? `${parsed.url.pathname}${parsed.url.search}${parsed.url.hash}`
    : result;
}

export function flowsGoogleAuthHref(placement?: string) {
  const cloudUrl = (process.env.NEXT_PUBLIC_CLOUD_URL || DEFAULT_CLOUD_URL).replace(/\/$/, '');
  const params = new URLSearchParams({
    source: 'flows',
    next: '/flows/deploy',
  });
  if (placement) params.set('utm_content', placement);
  return `${cloudUrl}/api/auth/google/start?${params.toString()}`;
}
