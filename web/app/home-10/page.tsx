import type { Metadata } from 'next';

import { HomeTen } from '../../components/home-10/HomeTen';

export const metadata: Metadata = {
  title: 'Agent Relay — let your coding agents talk to each other',
  robots: { index: false, follow: false },
};

export default function HomeTenPage() {
  return <HomeTen />;
}
