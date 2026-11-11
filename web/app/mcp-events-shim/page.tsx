import type { Metadata } from 'next';

import { EventsShimTry } from '../../components/events-shim/EventsShimTry';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { SiteNavActions } from '../../components/SiteNavActions';
import { defaultOgImage } from '../../lib/og-meta';
import { absoluteUrl, SITE_NAME } from '../../lib/site';

const TITLE = 'Webhooks that wake your agent';
const DESCRIPTION =
  'Add one MCP server to your agent, point any webhook at your URL, and every post wakes the agent, even when it is idle. Built on Agent Relay.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/mcp-events-shim') },
  openGraph: {
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/mcp-events-shim'),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [defaultOgImage().url],
  },
  // The page holds per-visitor capability links in its fragment; nothing to index beyond the landing copy.
  robots: { index: true, follow: true },
};

export default function McpEventsShimPage() {
  return (
    <>
      <SiteNav hideLinks singleAction actions={<SiteNavActions />} />
      <EventsShimTry />
      <SiteFooter />
    </>
  );
}
