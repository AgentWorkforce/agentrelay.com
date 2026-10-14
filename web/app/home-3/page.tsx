import type { Metadata } from 'next';

import { HomeThree } from '../../components/home-3/HomeThree';

export const metadata: Metadata = {
  title: 'Agent Relay — Let your agents talk',
  description:
    'Agent Relay connects coding agents across tools, machines, and teammates. They coordinate without you, so you ship faster.',
  robots: { index: false, follow: false },
};

export default function HomeThreePage() {
  return <HomeThree />;
}
