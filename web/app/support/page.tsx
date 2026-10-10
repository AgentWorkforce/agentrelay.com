import type { Metadata } from 'next';
import Link from 'next/link';

import { GitHubStarsBadge } from '../../components/GitHubStars';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { absoluteUrl, SITE_EMAIL } from '../../lib/site';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Support',
  description: 'Get help with Agent Relay products, accounts, billing, privacy, and open-source tools.',
  alternates: {
    canonical: absoluteUrl('/support'),
  },
};

export default function SupportPage() {
  return (
    <div className={s.page}>
      <SiteNav actions={<GitHubStarsBadge />} />

      <main className={s.content}>
        <h1 className={s.title}>Agent Relay support</h1>
        <p className={s.subtitle}>
          Get help with Agent Relay products, accounts, billing, integrations, and open-source tools.
        </p>

        <section className={s.section}>
          <h2>Contact support</h2>
          <p>
            Email{' '}
            <a href={`mailto:${SITE_EMAIL}`} className={s.link}>
              {SITE_EMAIL}
            </a>{' '}
            with a short description of the problem, the Agent Relay product you are using, and the operating
            system or browser involved. Include exact error text when it is safe to share.
          </p>
          <p>
            Do not send workspace keys, API tokens, passwords, private source code, or other credentials. We
            will ask for sanitized diagnostic details if they are needed.
          </p>
        </section>

        <section className={s.section}>
          <h2>Open-source issues</h2>
          <p>
            Reproducible bugs can also be reported through the relevant repository’s issue tracker. Find the
            project in the{' '}
            <a href="https://github.com/AgentWorkforce" className={s.link}>
              Agent Workforce GitHub organization
            </a>
            . For account, billing, security, or private workspace questions, email us instead of posting
            publicly.
          </p>
        </section>

        <section className={s.section}>
          <h2>Privacy and terms</h2>
          <p>
            See the{' '}
            <Link href="/privacy" className={s.link}>
              Privacy Policy
            </Link>{' '}
            for information about data handling and the{' '}
            <Link href="/terms" className={s.link}>
              Terms of Service
            </Link>{' '}
            for the conditions that apply to Agent Relay services.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
