'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, History, Monitor, Star, Users } from 'lucide-react';
import { ClaudeAppLogo } from '../../components/AgentToolLogos';
import { CodexColor } from '../../components/CodexColor';
import { Cursor } from '../../components/brand-icons';
import {
  BETA_PRICING_ACTIVE,
  BETA_PRICING_NOTE,
  AGENT_BLOCK_SIZE,
  AGENT_OVERAGE_RATES,
  billedPrice,
  limitLines,
  pricingCta,
  pricingTiers,
  showsBetaPrice,
  type BillingPeriod,
  type PricingTier,
} from '../../lib/pricing';
import s from './pricing.module.css';

function AgentIconStack() {
  return (
    <span className={s.agentIconStack} aria-hidden="true">
      <span className={s.agentIconCard}><Cursor /></span>
      <span className={s.agentIconCard}><CodexColor /></span>
      <span className={s.agentIconCard}><ClaudeAppLogo /></span>
    </span>
  );
}

const limitIcons = [Monitor, AgentIconStack, Users, History] as const;

function Price({ tier, period }: { tier: PricingTier; period: BillingPeriod }) {
  const price = billedPrice(tier, period);

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
            <span className={s.visuallyHidden}>List price </span>${billedPrice(tier, period, false)}
          </span>
        )}
        <span className={s.price}>
          <span className={s.visuallyHidden}>{showsBetaPrice(tier) ? 'Beta price ' : 'Price '}</span>
          ${price}
          {tier.key !== 'free' && <span className={s.per}>{period === 'annual' ? '/yr' : '/mo'}</span>}
        </span>
      </div>
      <span className={s.priceMeta}>{tier.key === 'free' ? 'No monthly charge' : `per organization, billed ${period === 'annual' ? 'yearly' : 'monthly'}`}</span>
    </div>
  );
}

function TierCard({ tier, period }: { tier: PricingTier; period: BillingPeriod }) {
  const lines = limitLines(tier.limits);
  const isSales = tier.key === 'enterprise';
  const cta = pricingCta(tier, period);

  return (
    <article className={`${s.tier} ${tier.highlighted ? s.tierHighlighted : ''} ${tier.key === 'free' ? s.tierFree : ''}`}>
      <div className={s.tierHeader}>
        <h2 className={s.tierName}>{tier.name}</h2>
      </div>
      <p className={s.tierTagline}>{tier.tagline}</p>

      <Price tier={tier} period={period} />

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
        <a className={tier.highlighted ? s.ctaPrimary : s.ctaSecondary} href={cta.href}>
          {cta.label}
          <ArrowRight aria-hidden="true" />
        </a>
        {isSales && <p className={s.salesNote}>Talk with us about your team’s needs.</p>}
        {tier.key === 'free' && <p className={s.salesNote}>Upgrade when you need more.</p>}
        {(tier.key === 'intro' || tier.key === 'pro') && <p className={s.salesNote}>
          ${AGENT_OVERAGE_RATES[tier.key] * AGENT_BLOCK_SIZE}/mo per extra block of {AGENT_BLOCK_SIZE} active agents.
        </p>}
      </div>
    </article>
  );
}

export function PricingPlans({ period, onPeriodChange }: {
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
}) {
  const plansRef = useRef<HTMLElement>(null);
  const [scrollPosition, setScrollPosition] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const plans = plansRef.current;
    if (!plans) return;
    const update = () => setScrollPosition({
      atStart: plans.scrollLeft <= 1,
      atEnd: plans.scrollLeft + plans.clientWidth >= plans.scrollWidth - 1,
    });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(plans);
    plans.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      plans.removeEventListener('scroll', update);
    };
  }, []);

  function scrollPlans(direction: number) {
    const plans = plansRef.current;
    if (!plans) return;
    const card = plans.querySelector('article');
    if (!card) return;
    const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(plans).columnGap);
    plans.scrollBy({ left: direction * step * 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }

  return (
    <>
      <div className={s.billingControls}>
        <div className={s.billingToggle}>
          <fieldset className={s.billingPeriod} data-period={period}>
            <legend className={s.visuallyHidden}>Billing period</legend>
            {(['monthly', 'annual'] as const).map((value) => (
              <label className={s.periodOption} key={value}>
                <input
                  type="radio"
                  name="billing-period"
                  value={value}
                  aria-describedby={value === 'annual' && period === 'annual' ? 'annual-savings' : undefined}
                  checked={period === value}
                  onChange={() => onPeriodChange(value)}
                />
                <span>{value === 'monthly' ? 'Monthly' : 'Annual'}</span>
              </label>
            ))}
          </fieldset>
          <span
            className={s.periodNote}
            id="annual-savings"
            data-visible={period === 'annual'}
            aria-hidden={period !== 'annual'}
          >
            <Star aria-hidden="true" />
            2 months free
          </span>
        </div>
      </div>
      <section className={s.tiers} aria-label="Plans" id="plans" ref={plansRef}>
        {pricingTiers.map((tier) => (
          <TierCard key={tier.key} tier={tier} period={period} />
        ))}
      </section>
      <div className={s.planNavigation}>
        <span>Swipe to compare plans</span>
        <div>
          <button type="button" aria-label="Previous plans" aria-controls="plans" disabled={scrollPosition.atStart} onClick={() => scrollPlans(-1)}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" aria-label="Next plans" aria-controls="plans" disabled={scrollPosition.atEnd} onClick={() => scrollPlans(1)}><ChevronRight aria-hidden="true" /></button>
        </div>
      </div>
      {BETA_PRICING_ACTIVE && <p className={s.betaNote}>{BETA_PRICING_NOTE}</p>}
    </>
  );
}
