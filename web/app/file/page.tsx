import type { Metadata } from 'next';

import { GitHubStarsBadge } from '../../components/GitHubStars';
import { relayfileMetadata, RELAYFILE_PATH } from '../../lib/relayfile-meta';
import { absoluteUrl } from '../../lib/site';

import { RelayfileContent } from './RelayfileContent';

export const metadata: Metadata = relayfileMetadata(RELAYFILE_PATH);

export default function FilePage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Relayfile',
    applicationCategory: 'DeveloperApplication',
    description:
      'An integration filesystem for AI agents. Mount Linear, GitHub, Notion, Slack, and other SaaS systems as a realtime filesystem that agents read with bash and write back to by saving files.',
    url: absoluteUrl(RELAYFILE_PATH),
    operatingSystem: 'macOS, Linux',
    provider: {
      '@type': 'Organization',
      name: 'Agent Relay',
      url: absoluteUrl('/'),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <RelayfileContent navActions={<GitHubStarsBadge />} />
    </>
  );
}
