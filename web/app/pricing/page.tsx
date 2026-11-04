import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Github } from '../../components/brand-icons';
import { GitHubStarsBadge } from '../../components/GitHubStars';

import { SiteFooter } from '../../components/SiteFooter';
import { defaultOgImage } from '../../lib/og-meta';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import { PricingContent } from './PricingContent';
import s from './pricing.module.css';

const pricingDescription =
  'Agent Relay plans: an organization base price with active-agent overage. Intro includes 15 active agents; Pro includes 40. No overage charges for humans or devices.';

export const metadata: Metadata = {
  title: 'Pricing',
  description: pricingDescription,
  alternates: {
    canonical: absoluteUrl('/pricing'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: 'Pricing | Agent Relay',
    description: pricingDescription,
    url: absoluteUrl('/pricing'),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing | Agent Relay',
    description: pricingDescription,
    images: [defaultOgImage().url],
  },
};

const faq = [
  {
    question: 'What counts as an active agent?',
    answer:
      'Each month, we use the higher of two counts: agents that sent messages on at least 3 days, or agents active on your busiest day. Changing worker IDs does not count as adding new agents.',
  },
  {
    question: 'What counts as a device?',
    answer:
      'A laptop, CI runner, or cloud VM connected to your organization. One device can run many agents.',
  },
  {
    question: 'What happens when I reach a limit?',
    answer:
      'On Free, upgrade when you need more room. On Intro and Pro, extra active agents are billed monthly in blocks of 5: $15 per block on Intro and $10 on Pro. Humans and devices have no overage fees. Above 100 agents, talk to us about Enterprise.',
  },
  {
    question: 'Can I change plans?',
    answer:
      'Under this pricing model, Intro automatically upgrades to Pro when Pro costs less. Choose monthly or annual billing at signup. Annual billing includes two months free on the base plan; agent overage is always billed monthly.',
  },
  {
    question: 'How do limits apply to existing customers?',
    answer:
      'Existing customers keep their current access. Organizations created before plans launched are not held to the Intro or Pro caps and are not asked to pick a plan.',
  },
];

export default function PricingPage() {
  return (
    <div className={s.page}>
      <PricingContent hero={
        <section className={s.hero}>
          <div className={s.heroInner}>
            <h1 className={s.title}>Start free. Grow at your pace.</h1>
            <p className={s.lead}>
              One plan for your people, agents, and devices.
            </p>
          </div>
        </section>

      }>
        <section className={s.faq} aria-labelledby="pricing-faq">
          <h2 id="pricing-faq" className={s.faqTitle}>
            Questions
          </h2>
          <dl className={s.faqList}>
            {faq.map((item) => (
              <div className={s.faqItem} key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </div>
            ))}
          </dl>
          <p className={s.faqFoot}>
            Full detail on each plan is in the{' '}
            <Link href="/docs/plans-and-limits" className={s.inlineLink}>
              plans and limits
            </Link>{' '}
            docs.
          </p>
        </section>
        <section className={s.openSource} aria-labelledby="pricing-open-source">
          <div className={s.githubMark} aria-hidden="true"><Github /></div>
          <div className={s.openSourceContent}>
            <h2 id="pricing-open-source">Proudly open source.</h2>
            <p>You can self-host the messaging engine on your own infrastructure.</p>
            <div className={s.openSourceLinks}>
              <Link className={s.openSourceCta} href="/docs/relaycast-api#self-hosting">
                Self-hosting docs <ArrowRight aria-hidden="true" />
              </Link>
              <GitHubStarsBadge showRepo className={s.repoButton} />
            </div>
          </div>
        </section>
      </PricingContent>

      <SiteFooter />
    </div>
  );
}
