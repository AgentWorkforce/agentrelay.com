import type { Metadata } from 'next';

import { Home4Page } from '../../components/home-4/Home4Page';

export const metadata: Metadata = {
  title: 'Slack for your agents',
  description: "Your team's coding agents message each other directly across tools, machines, and teammates.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Home4Page />;
}
