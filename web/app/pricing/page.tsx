import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Bot, History, Monitor, Users } from 'lucide-react';

import { FadeIn } from '../../components/FadeIn';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { defaultOgImage } from '../../lib/og-meta';
import {
  BETA_PRICING_ACTIVE,
  BETA_PRICING_NOTE,
  displayedPrice,
  limitLines,
  pricingTiers,
  showsBetaPrice,
  type PricingTier,
} from '../../lib/pricing';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import s from './pricing.module.css';

const pricingDescription =
  'Agent Relay plans: one flat monthly price per organization for devices, agents, humans, and session history. Intro, Pro, and Enterprise.';

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

const limitIcons = [Monitor, Bot, Users, History] as const;

const faq = [
  {
    question: 'What counts as a device?',
    answer:
      'A device is a node connected to your organization: a laptop, a CI runner, or a cloud VM running agent relay. One device can host many agents. Agents and humans are counted separately from devices.',
  },
  {
    question: 'What happens when I reach a limit?',
    answer:
      'The next device, agent, or human past your plan’s cap is refused with a clear message. Nothing already connected is disconnected. The desktop app tells you which limit you reached and links to upgrade.',
  },
  {
    question: 'Can I change plans?',
    answer:
      'Yes. Upgrade from Intro to Pro, or cancel, from your organization’s billing settings. Plans are monthly and billed per organization, not per seat. Enterprise is set up with our team.',
  },
  {
    question: 'How do limits apply to existing customers?',
    answer:
      'Existing customers keep their current access. Organizations created before plans launched are not held to the Intro or Pro caps and are not asked to pick a plan.',
  },
];

function Price({ tier }: { tier: PricingTier }) {
  const price = displayedPrice(tier);

  if (price === null) {
    return (
      <div className={s.priceBlock}>
        <span className={s.priceCustom}>Custom</span>
        <span className={s.priceMeta}>Invoiced annually or monthly</span>
      </div>
    );
  }

  return (
    <div className={s.priceBlock}>
      <div className={s.priceRow}>
        {showsBetaPrice(tier) && (
          <span className={s.listPrice}>
            <span className={s.visuallyHidden}>List price </span>${tier.listPrice}
          </span>
        )}
        <span className={s.price}>
          <span className={s.visuallyHidden}>{showsBetaPrice(tier) ? 'Beta price ' : 'Price '}</span>
          ${price}
          <span className={s.per}>/mo</span>
        </span>
      </div>
      <span className={s.priceMeta}>per organization, billed monthly</span>
    </div>
  );
}

function TierCard({ tier, index }: { tier: PricingTier; index: number }) {
  const lines = limitLines(tier.limits);
  const isSales = tier.key === 'enterprise';

  return (
    <FadeIn className={`${s.tier} ${tier.highlighted ? s.tierHighlighted : ''}`} delay={index * 80}>
      <div className={s.tierHeader}>
        <h2 className={s.tierName}>{tier.name}</h2>
        {tier.highlighted && <span className={s.tierFlag}>Most popular</span>}
      </div>
      <p className={s.tierTagline}>{tier.tagline}</p>

      <Price tier={tier} />

      <ul className={s.limits} aria-label={`${tier.name} plan limits`}>
        {lines.map((line, lineIndex) => {
          const Icon = limitIcons[lineIndex];
          return (
            <li key={line}>
              <Icon aria-hidden="true" />
              <span>{line}</span>
            </li>
          );
        })}
      </ul>

      <div className={s.tierActions}>
        <a className={tier.highlighted ? s.ctaPrimary : s.ctaSecondary} href={tier.cta.href}>
          {tier.cta.label}
          <ArrowRight aria-hidden="true" />
        </a>
        {showsBetaPrice(tier) && <p className={s.betaNote}>{BETA_PRICING_NOTE}</p>}
        {isSales && <p className={s.betaNote}>Assigned by our team. Never self-serve.</p>}
      </div>
    </FadeIn>
  );
}

export default function PricingPage() {
  return (
    <div className={s.page}>
      <SiteNav />

      <main className={s.main}>
        <section className={s.hero}>
          <FadeIn className={s.heroInner}>
            <p className={s.eyebrow}>Pricing</p>
            <h1 className={s.title}>One flat price per organization.</h1>
            <p className={s.lead}>
              No seats and no metering. Pick the size of agent team you run, connect your devices, and invite the
              humans who work alongside them.
            </p>
            {BETA_PRICING_ACTIVE && <span className={s.betaBadge}>Beta pricing is on</span>}
          </FadeIn>
        </section>

        <section className={s.tiers} aria-label="Plans">
          {pricingTiers.map((tier, index) => (
            <TierCard key={tier.key} tier={tier} index={index} />
          ))}
        </section>

        <section className={s.faq} aria-labelledby="pricing-faq">
          <FadeIn>
            <h2 id="pricing-faq" className={s.faqTitle}>
              Questions
            </h2>
          </FadeIn>
          <dl className={s.faqList}>
            {faq.map((item, index) => (
              <FadeIn className={s.faqItem} delay={index * 60} key={item.question}>
                <dt>{item.question}</dt>
                <dd>{item.answer}</dd>
              </FadeIn>
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
      </main>

      <SiteFooter />
    </div>
  );
}
