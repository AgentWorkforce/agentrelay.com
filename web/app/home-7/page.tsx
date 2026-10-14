import type { Metadata } from 'next';

import { HomeSeven } from '../../components/home-7/HomeSeven';

export const metadata: Metadata = {
  title: 'Agent Relay — your agents can talk to each other',
  description:
    'Agent Relay connects Claude Code, Codex, Cursor and Conductor across machines and teammates. Stop forwarding context between terminals; your agents sort it out.',
  robots: { index: false, follow: false },
};

export default function HomeSevenPage() {
  return <HomeSeven />;
}
