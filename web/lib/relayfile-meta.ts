import type { Metadata } from 'next';

import { ogImage } from './og-meta';
import { absoluteUrl, SITE_NAME } from './site';

/**
 * Metadata for the Relayfile landing page.
 *
 * The page is served from two paths — `/file` (canonical) and the `/relayfile`
 * alias, which re-exports the same component — so the descriptors are built here
 * once and both routes point their canonical at `/file`. Copy mirrors the live
 * hero (badge, headline, subtitle) so the search snippet and the social card say
 * the same thing the page does.
 */

/** The canonical path for the Relayfile landing page. */
export const RELAYFILE_PATH = '/file';

/** The page's Open Graph card route. */
export const RELAYFILE_OG_PATH = '/file/og.png';

const TITLE = 'Relayfile — Integration filesystem for AI agents';

const DESCRIPTION =
  'Mount Linear, GitHub, Notion, Slack, and your own systems as a realtime filesystem. Agents read provider data with bash and write records by saving files.';

const SOCIAL_DESCRIPTION =
  'Mount Linear, GitHub, Notion, Slack, HubSpot, Salesforce, and your own systems as a realtime filesystem that agents can read, write, and watch.';

/**
 * Build the Relayfile landing metadata.
 * @param path - The route this metadata is rendered on. Only `/file` is
 * canonical; the alias passes its own path so `openGraph.url` stays truthful
 * while the canonical still points at `/file`.
 */
export function relayfileMetadata(path: string = RELAYFILE_PATH): Metadata {
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'Relayfile',
      'integration filesystem',
      'agent filesystem',
      'MCP alternative',
      'AI agent integrations',
      'Linear API for agents',
      'Notion API for agents',
      'agent tool calling',
      'SaaS integrations for AI agents',
    ],
    alternates: {
      canonical: absoluteUrl(RELAYFILE_PATH),
    },
    openGraph: {
      title: TITLE,
      description: SOCIAL_DESCRIPTION,
      url: absoluteUrl(path),
      type: 'website',
      // A page-level `openGraph` replaces the root layout's wholesale, so the
      // site-wide siteName/locale have to be restated here to survive.
      siteName: SITE_NAME,
      locale: 'en_US',
      images: [
        ogImage(
          RELAYFILE_OG_PATH,
          'Relayfile — mount Linear, GitHub, Notion, and Slack as a realtime filesystem for AI agents.'
        ),
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: SOCIAL_DESCRIPTION,
      images: [absoluteUrl(RELAYFILE_OG_PATH)],
    },
  };
}
