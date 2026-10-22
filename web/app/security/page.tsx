import type { Metadata } from 'next';
import Link from 'next/link';
import { GitHubStarsBadge } from '../../components/GitHubStars';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { absoluteUrl } from '../../lib/site';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Vulnerability disclosure — Agent Relay',
  description: 'How to report security vulnerabilities in Agent Relay.',
  alternates: { canonical: absoluteUrl('/security') },
};

export default function Page() {
  return (
    <div className={s.page}>
      <SiteNav actions={<GitHubStarsBadge />} />
      <main className={s.content}>
        <p className={s.meta}>Last reviewed: October 14, 2026</p>
        <h1 className={s.title}>Vulnerability disclosure</h1>
        <p className={s.subtitle}>Help us keep Agent Relay and its users safe.</p>
        <section className={s.section}>
          <h2>Report a vulnerability</h2>
          <p>Email <a href="mailto:security@agentrelay.com">security@agentrelay.com</a> or use <a href="https://github.com/AgentWorkforce/relay/security/advisories/new">GitHub private security reporting</a>. Please include the affected product, version or URL, potential impact, and steps to reproduce or a proof of concept. Keep reports private and omit unnecessary personal data and credentials.</p>
          <p>We aim to acknowledge reports within two business days, provide an initial assessment within ten business days, and keep you informed until resolution.</p>
        </section>
        <section className={s.section}>
          <h2>Scope</h2>
          <p>Agent Relay Cloud and hosted services under agentrelay.com, Desktop and CLI releases, and open-source repositories in the AgentWorkforce GitHub organization are in scope.</p>
          <p>Social engineering, physical attacks, denial-of-service testing, automated scanner findings without demonstrated impact, and third-party services we do not operate are out of scope. Report upstream vulnerabilities to the upstream project.</p>
        </section>
        <section className={s.section}>
          <h2>Good-faith research and safe harbor</h2>
          <p>We will not pursue legal action for good-faith research that avoids privacy violations, data destruction, and service disruption; uses only accounts you own or have explicit permission to test; and does not access or retain other users&apos; data beyond what is needed to demonstrate the issue.</p>
          <p>Give us reasonable time to fix an issue before public disclosure. We aim for coordinated disclosure within 90 days and will discuss timing with you.</p>
        </section>
        <section className={s.section}>
          <h2>Recognition</h2>
          <p>We do not currently run a paid bug bounty. With your permission, we can credit your contribution publicly.</p>
          <p>See our <Link href="/trust">trust page</Link> for current product controls and readiness gaps.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
