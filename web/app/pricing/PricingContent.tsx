'use client';

import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { SiteNav } from '../../components/SiteNav';
import { pricingCta, pricingTiers, type BillingPeriod } from '../../lib/pricing';
import { PricingPlans } from './PricingPlans';
import s from './pricing.module.css';

export function PricingContent({ hero, children }: { hero: ReactNode; children: ReactNode }) {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const cta = pricingCta(pricingTiers.find((tier) => tier.key === 'pro')!, period);

  return (
    <>
      <SiteNav hideLinks singleAction actions={
        <a className={s.navCta} href={cta.href}>
          {cta.label}<ArrowRight aria-hidden="true" />
        </a>
      } />
      <main className={s.main}>
        {hero}
        <PricingPlans period={period} onPeriodChange={setPeriod} />
        {children}
      </main>
    </>
  );
}
