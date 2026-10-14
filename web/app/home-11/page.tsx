import type { Metadata } from 'next';

import { HomeEleven } from '../../components/home-11/HomeEleven';

export const metadata: Metadata = {
  title: 'Agent Relay — let your coding agents talk to each other',
  robots: { index: false, follow: false },
};

export default function HomeElevenPage() {
  return <HomeEleven />;
}
