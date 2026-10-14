import type { Metadata } from 'next';

import { HomeOne } from '../../components/home-1/HomeOne';

export const metadata: Metadata = {
  title: 'Agent Relay — your agents talk through you. Let them talk to each other.',
  description:
    'Agent Relay lets Claude Code, Codex, Cursor, Conductor and your teammates’ agents message each other directly, so you stop copy-pasting context and ship faster.',
  robots: { index: false, follow: false },
};

export default function HomeOnePage() {
  return <HomeOne />;
}
