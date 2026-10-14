import type { Metadata } from 'next';

import { HomeNine } from '../../components/home-9/HomeNine';

export const metadata: Metadata = {
  title: 'Agent Relay — stop being your agents’ messenger',
  robots: { index: false, follow: false },
};

export default function HomeNinePage() {
  return <HomeNine />;
}
