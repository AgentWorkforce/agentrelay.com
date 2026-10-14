import type { Metadata } from 'next';

import { NetworkHomePage } from '../../components/home-5/NetworkHomePage';

export const metadata: Metadata = {
  title: 'Stop being the messenger',
  description:
    "Agent Relay lets your team's coding agents talk to each other directly — across tools, machines, and teammates.",
  robots: { index: false, follow: false },
};

export default function HomeFivePage() {
  return <NetworkHomePage />;
}
