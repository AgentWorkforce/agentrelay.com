import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PricingSandbox } from './PricingSandbox';
import s from './sandbox.module.css';

export const metadata: Metadata = {
  title: 'Pricing sandbox',
  robots: { index: false, follow: false },
};

export default function PricingSandboxPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main className={s.sandbox}>
      <header className={s.header}>
        <Link href="/pricing">Back to pricing</Link>
        <h1>Pricing sandbox</h1>
        <p>Explore Intro and Pro rates and allowances. This model excludes the Free plan.</p>
      </header>
      <PricingSandbox />
    </main>
  );
}
