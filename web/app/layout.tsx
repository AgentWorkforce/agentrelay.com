import type { Metadata } from 'next';
import { PostHogProvider } from '@posthog/next';
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

import { defaultOgImage } from '../lib/og-meta';
import { absoluteUrl, POSTHOG_HOST, SITE_EMAIL, SITE_NAME, SITE_URL } from '../lib/site';
import { WebsitePostHogPageView } from './PostHogPageView';
import './globals.css';

// Two families carry the whole site: a characterful display grotesque set very
// large and very tight, and a quiet text grotesque for everything else. Both are
// single-axis (wght) variable faces, so two files cover the full weight ladder.
// The variable names stay `--font-geist-sans` / `--font-heading` because ~25 CSS
// modules reference them by those names.
const instrumentSans = Instrument_Sans({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
});

const bricolage = Bricolage_Grotesque({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
});

// Mono only ever appears below or beside the LCP element, so it stays off the
// critical path: two preloaded families instead of three.
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: 'Agent Relay',
  title: {
    default: 'Agent Relay',
    template: '%s | Agent Relay',
  },
  description:
    'Add channels, DMs, durable delivery, event listeners, and Zod-typed actions to any agent runtime.',
  keywords: [
    'Agent Relay',
    'multi-agent',
    'agent communication',
    'MCP',
    'AI SDK',
    'agent relay',
    'headless slack for agents',
    'agent actions',
    'agent delivery',
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    siteName: 'Agent Relay',
    type: 'website',
    locale: 'en_US',
    images: [defaultOgImage()],
  },
  icons: {
    icon: '/favicon.svg',
  },
  twitter: {
    card: 'summary_large_image',
    images: [defaultOgImage().url],
  },
};

// Site-wide structured data. Individual pages add their own Article/Service/
// CollectionPage nodes and reference these two by @id, so an agent reading any
// single page still resolves the publisher and the site root.
const siteStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      email: SITE_EMAIL,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/agent-relay-logo-white.svg'),
      },
      description:
        'Agent Relay is the messaging layer for AI agents: channels, DMs, durable delivery, event listeners, and typed actions for any agent runtime.',
      sameAs: [
        'https://github.com/agentworkforce/relay',
        'https://twitter.com/agent_relay',
        'https://discord.gg/RJGE7CHV',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'en-US',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      publisher: { '@id': `${SITE_URL}/#organization` },
      description:
        'Add channels, DMs, durable delivery, event listeners, and Zod-typed actions to any agent runtime.',
      softwareHelp: { '@type': 'CreativeWork', url: absoluteUrl('/docs') },
    },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const postHogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const content = postHogKey ? (
    <PostHogProvider
      clientOptions={{
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? POSTHOG_HOST,
        autocapture: true,
        capture_exceptions: true,
        capture_heatmaps: true,
        capture_pageleave: true,
      }}
    >
      <WebsitePostHogPageView />
      {children}
    </PostHogProvider>
  ) : (
    children
  );

  return (
    <html lang="en" data-theme="dark">
      <head>
        {/* Machine-readable mirrors of this site, advertised on every page so an
            agent that lands anywhere can find the plain-text and feed formats. */}
        <link rel="alternate" type="text/plain" href={absoluteUrl('/llms.txt')} title="llms.txt" />
        <link
          rel="alternate"
          type="text/plain"
          href={absoluteUrl('/llms-full.txt')}
          title="llms.txt (full text)"
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          href={absoluteUrl('/feed.xml')}
          title="Agent Relay blog"
        />
      </head>
      <body
        className={`${instrumentSans.variable} ${geistMono.variable} ${bricolage.variable}`}
        suppressHydrationWarning
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData) }}
        />
        {content}
      </body>
    </html>
  );
}
