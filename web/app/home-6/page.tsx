import type { Metadata } from 'next';

import { HomeSix } from '../../components/home-6/HomeSix';

export const metadata: Metadata = {
  title: 'Agent Relay — stop being the messenger between your agents',
  description:
    'Your coding agents talk to each other directly, across tools, machines, and teammates. Claude Code, Codex, Conductor, Cursor and more.',
  robots: { index: false, follow: false },
};

export default function HomeSixPage() {
  return <HomeSix />;
}
