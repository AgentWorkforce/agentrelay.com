import type { Metadata } from 'next';

import { DurableWorkflowsLandingPage } from '../components/workflows/DurableWorkflowsLandingPage';
import { HOME_OG_IMAGE_PATH, ogImage } from '../lib/og-meta';
import { absoluteUrl } from '../lib/site';

export const metadata: Metadata = {
  title: 'Durable workflows for AI agents',
  description:
    'Build reliable agent workflows with durable execution, retries, observability, approval gates, and interactive human breakpoints.',
  alternates: {
    canonical: absoluteUrl('/'),
  },
  openGraph: {
    title: 'Agent Relay - Durable workflows for AI agents',
    description:
      'Build, deploy, and observe reliable agent workflows with durable execution and human approval built in.',
    url: absoluteUrl('/'),
    type: 'website',
    images: [ogImage(HOME_OG_IMAGE_PATH, 'Agent Relay - Durable workflows for AI agents')],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Agent Relay - Durable workflows for AI agents',
    description:
      'Build, deploy, and observe reliable agent workflows with durable execution and human approval built in.',
    images: [absoluteUrl(HOME_OG_IMAGE_PATH)],
  },
};

export default function HomePage() {
  return <DurableWorkflowsLandingPage />;
}
