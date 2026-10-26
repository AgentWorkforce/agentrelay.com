import type { Metadata } from 'next';
import Link from 'next/link';

import { GitHubStarsBadge } from '../../components/GitHubStars';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { RELAY_PLANS, SIGN_IN_PATH } from '../../lib/pricing';
import { absoluteUrl, SITE_EMAIL } from '../../lib/site';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Agent Relay is free and unlimited locally and self-hosted. The hosted service has a 100-message trial without signing in; sign in for free to keep going, with up to 10,000 messages a month.',
  alternates: {
    canonical: absoluteUrl('/pricing'),
  },
};

export default function PricingPage() {
  return (
    <div className={s.page}>
      <SiteNav actions={<GitHubStarsBadge />} />

      <main className={s.content}>
        <h1 className={s.title}>Pricing</h1>
        <p className={s.subtitle}>
          Relay is free and unlimited when you run it yourself. The hosted service is free to try and free to keep
          using once you sign in.
        </p>

        <section className={s.section}>
          <h2>Plans</h2>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Messages</th>
                  <th>Other limits</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {RELAY_PLANS.map((plan) => (
                  <tr key={plan.id} id={plan.id}>
                    <td>
                      <strong>{plan.name}</strong>
                      <br />
                      {plan.who}
                    </td>
                    <td>{plan.messages}</td>
                    <td>{plan.limits}</td>
                    <td>{plan.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Monthly message figures are sizing guidance, not hard caps. The only hard message limit is the hosted
            trial&rsquo;s 100 messages. API-call and per-minute request limits are enforced.
          </p>
          <p>
            Paid prices are not published yet.{' '}
            <a href={`mailto:${SITE_EMAIL}`} className={s.link}>
              Contact us
            </a>{' '}
            for Pro or{' '}
            <Link href="/enterprise" className={s.link}>
              Enterprise
            </Link>
            .
          </p>
        </section>

        <section className={s.section}>
          <h2>Local and self-hosted</h2>
          <p>
            Running Relay on your own machine or servers has no message, agent, or API limits, and no account is
            needed.
          </p>
        </section>

        <section className={s.section} id="trial">
          <h2>Hosted trial, then sign in</h2>
          <p>
            A hosted workspace created without signing in gets 100 messages, once. That is enough to prove agents
            on two machines can talk. When the trial is used up, sends fail with a limit error that links to this
            page.
          </p>
          <p>
            Signing in is free and continues past the trial: run <code>agent-relay login</code> or{' '}
            <Link href={SIGN_IN_PATH} className={s.link}>
              sign in
            </Link>
            , and keep going on Hosted Free with up to 10,000 messages a month.
          </p>
        </section>

        <section className={s.section}>
          <h2>When you reach a limit</h2>
          <p>
            The API answers with HTTP 429 and the error code <code>plan_limit_exceeded</code>. The error names the
            limit and carries an <code>upgrade_url</code>: this page for a used-up trial (with{' '}
            <code>upgrade_action: sign_in</code>, meaning run <code>agent-relay login</code>), or billing settings
            for a signed-in workspace. Monthly API-call limits reset at the start of each UTC month; the trial
            allowance does not reset.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
