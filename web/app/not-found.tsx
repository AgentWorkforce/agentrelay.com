import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

import { AgentToolLogo } from '../components/AgentToolLogos';
import { LogoIcon, LogoWordmark } from '../components/SiteNav';
import { LostField } from './not-found/LostField';
import { RouteReadout } from './not-found/RouteReadout';
import s from './not-found/not-found.module.css';

export const metadata: Metadata = {
  title: 'Lost in the relay',
  description: 'This Agent Relay route could not be found.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className={s.page}>
      <LostField />
      <div aria-hidden="true" className={s.vignette} />

      <header className={s.nav}>
        <Link href="/" className={s.brand} aria-label="Agent Relay home">
          <LogoIcon />
          <LogoWordmark />
        </Link>
      </header>

      <section className={s.content}>
        <div className={s.code} aria-hidden="true">
          <span className={s.digit} data-text="4">
            4
          </span>
          <span className={s.zero}>
            <AgentToolLogo className={s.zeroMark} idPrefix="" provider="claude" />
          </span>
          <span className={s.digit} data-text="4">
            4
          </span>
        </div>

        <h1 className={s.title}>This page wandered off the relay.</h1>
        <p className={s.lede}>
          We sent every agent we had to find it. As you can see, they are lost too.
        </p>

        <RouteReadout />

        <div className={s.actions}>
          <Link href="/" className={s.primaryAction}>
            <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
            Back to home
          </Link>
          <Link href="/docs" className={s.secondaryAction}>
            <BookOpen aria-hidden="true" size={18} strokeWidth={1.8} />
            Read the docs
          </Link>
        </div>
      </section>

      <footer className={s.footer}>
        <span>Undeliverable messages return to sender. Eventually.</span>
        <span className={s.hint}>psst · click anywhere</span>
      </footer>
    </main>
  );
}
