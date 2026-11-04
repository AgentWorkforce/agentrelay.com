'use client';

import { useState } from 'react';
import type { BillingPeriod } from '../../../lib/pricing';
import { PricingVisualizer } from '../PricingVisualizer';
import s from './sandbox.module.css';

export function PricingSandbox() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');

  return (
    <>
      <fieldset className={s.period}>
        <legend>Billing period</legend>
        {(['monthly', 'annual'] as const).map((value) => (
          <label key={value}>
            <input type="radio" name="sandbox-period" value={value}
              checked={period === value} onChange={() => setPeriod(value)} />
            {value === 'monthly' ? 'Monthly' : 'Annual'}
          </label>
        ))}
      </fieldset>
      <PricingVisualizer period={period} />
    </>
  );
}
