import type { Metadata } from 'next';

import { HomeEight } from '../../components/home-8/HomeEight';

export const metadata: Metadata = {
  title: 'Agent Relay — stop being your agents’ messenger',
  description:
    'Claude Code, Codex, Cursor and your teammates’ agents message each other directly through Agent Relay, so you stop copy-pasting context between them.',
  robots: { index: false, follow: false },
};

export default function HomeEightPage() {
  return <HomeEight />;
}
