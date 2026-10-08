const TRACKED_ROUTE_PREFIXES = [
  { prefix: '/flows', pageGroup: 'flows' },
  { prefix: '/teams', pageGroup: 'teams' },
  { prefix: '/docs', pageGroup: 'docs' },
  { prefix: '/blog', pageGroup: 'blog' },
  { prefix: '/primitives', pageGroup: 'primitives' },
  { prefix: '/openclaw', pageGroup: 'openclaw' },
  { prefix: '/skill', pageGroup: 'skill' },
] as const;

const EXCLUDED_ROUTE_PREFIXES = ['/openclaw/skill/invite/'] as const;

// The owner analytics dashboard (and its grant exchange) is private: no page
// views, autocapture, replay, or page-leave events are ever sent from it.
const AGENT_DASHBOARD_PATH = /^\/u\/[^/]+\/dashboard(?:\/|$)/;

export function isAgentDashboardPath(pathname: string | null | undefined): boolean {
  return !!pathname && AGENT_DASHBOARD_PATH.test(pathname);
}

function pathnameOf(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    return new URL(url, 'https://agentrelay.com').pathname;
  } catch {
    return null;
  }
}

/** PostHog before_send: drop every event raised on, or describing, a dashboard page. */
export function dropAgentDashboardAnalytics<T>(event: T | null): T | null {
  if (!event) return event;
  if (isAgentDashboardPath(globalThis.location?.pathname)) return null;
  const properties = (event as { properties?: Record<string, unknown> }).properties;
  if (properties && (
    isAgentDashboardPath(pathnameOf(properties.$current_url))
    || isAgentDashboardPath(typeof properties.$pathname === 'string' ? properties.$pathname : null)
  )) return null;
  return event;
}

export type WebsiteAnalyticsPage = {
  pageGroup: (typeof TRACKED_ROUTE_PREFIXES)[number]['pageGroup'];
  pathname: string;
};

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getWebsiteAnalyticsPage(pathname: string | null | undefined): WebsiteAnalyticsPage | null {
  if (!pathname) return null;
  if (isAgentDashboardPath(pathname)) return null;
  if (EXCLUDED_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const match = TRACKED_ROUTE_PREFIXES.find(({ prefix }) => matchesPrefix(pathname, prefix));
  if (!match) return null;

  return {
    pageGroup: match.pageGroup,
    pathname,
  };
}
