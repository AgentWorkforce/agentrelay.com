import type { Metadata, Viewport } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';

import { ogImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import './skip.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });

const title = 'Skip | The engineering manager for your coding agents';
const description =
  'Skip plans work, coordinates your coding agents, and brings you in only when your judgment is needed.';
const ogPath = '/skip/og.png';

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  applicationName: 'Skip',
  keywords: ['coding agents', 'AI engineering manager', 'agent orchestration', 'Agent Relay', 'developer tools'],
  alternates: { canonical: absoluteUrl('/skip') },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description,
    url: absoluteUrl('/skip'),
    siteName: 'Skip',
    type: 'website',
    images: [ogImage(ogPath, 'Give your coding agents a manager. Skip keeps every session moving.')],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [absoluteUrl(ogPath)],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fbfbfa',
};

export default function SkipLayout({ children }: { children: ReactNode }) {
  return <div className={`${geist.variable} skipPage`}>{children}</div>;
}
