import type { Metadata } from 'next';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { SiteNavActions } from '../../components/SiteNavActions';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import { AgentsGallery } from './AgentsGallery';

const title = 'Agents — Proactive agents ready to deploy';
const description =
  'A gallery of open-source proactive agents that review PRs, triage issues, monitor releases, and digest your work. Fork one and deploy it on Agent Relay.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: absoluteUrl('/agents'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title,
    description,
    url: absoluteUrl('/agents'),
  },
};

export default function AgentsPage() {
  return (
    <>
      <SiteNav hideLinks singleAction actions={<SiteNavActions />} />
      <AgentsGallery />
      <SiteFooter />
    </>
  );
}
