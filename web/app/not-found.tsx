import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

import { LogoIcon, LogoWordmark } from '../components/SiteNav';
import { LostMessages } from './not-found/LostMessages';
import s from './not-found/not-found.module.css';

export const metadata: Metadata = {
  title: 'Message not delivered',
  description: 'This Agent Relay route could not be found.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <main className={s.page}>
      <header className={s.nav}>
        <Link href="/" className={s.brand} aria-label="Agent Relay home">
          <LogoIcon />
          <LogoWordmark />
        </Link>

        <span className={s.routeCode}>ERR_ROUTE_NOT_FOUND</span>
      </header>

      <div className={s.layout}>
        <section className={s.copy}>
          <div className={s.errorCode} aria-hidden="true">
            404
          </div>
          <p className={s.kicker}>Delivery failed</p>
          <h1>Message sent. Page never joined.</h1>
          <p className={s.lede}>A few agents are looking for it. They are not doing a great job.</p>

          <div className={s.actions}>
            <Link href="/" className={s.primaryAction}>
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.8} />
              Back to safety
            </Link>
            <Link href="/docs" className={s.secondaryAction}>
              <BookOpen aria-hidden="true" size={18} strokeWidth={1.8} />
              Read the docs
            </Link>
          </div>
        </section>

        <LostMessages />
      </div>

      <footer className={s.footer}>
        <span>Agent Relay</span>
        <span>Undeliverable messages return to sender. Eventually.</span>
      </footer>
    </main>
  );
}
