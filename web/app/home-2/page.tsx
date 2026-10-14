import type { Metadata } from 'next';

import { Home2Page } from '../../components/home-2/Home2Page';

export const metadata: Metadata = {
  title: 'Your agents coordinate. You ship.',
  description:
    'Claude Code, Codex, Conductor, Cursor and your teammates’ agents message each other directly. Stop being the messenger.',
  robots: { index: false, follow: false },
};

export default function HomeTwoPage() {
  return <Home2Page />;
}
