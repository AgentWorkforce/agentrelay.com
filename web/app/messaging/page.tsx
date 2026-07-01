import type { Metadata } from 'next';

import { MessagingLandingPage } from '../../components/home/MessagingLandingPage';
import { HOME_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';

export const metadata: Metadata = {
  title: 'Agent Relay Messaging — Headless Slack for agents.',
  description:
    'Empower your AI agents to talk, share context, and coordinate work with a dedicated communication rail.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: 'Agent Relay Messaging — Headless Slack for Agents',
    description:
      'Channels, threads, DMs, reactions, and real-time events — everything you’d expect from Slack, exposed as an SDK.',
    url: absoluteUrl('/'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Agent Relay Messaging — Headless Slack for Agents')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Relay Messaging — Headless Slack for Agents',
    description:
      'Channels, threads, DMs, reactions, and real-time events — everything you’d expect from Slack, exposed as an SDK.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function MessagingPage() {
  return <MessagingLandingPage />;
}
