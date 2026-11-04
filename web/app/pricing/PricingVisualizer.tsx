'use client';

import { useEffect, useState } from 'react';
import { AGENT_BLOCK_SIZE, AGENT_OVERAGE_RATES, displayedPrice, PLAN_LIMITS, pricingTiers, SALES_HREF, type BillingPeriod } from '../../lib/pricing';
import { estimateAutomaticPlan, estimatePlan, scaleCurve, type PricingModel } from '../../lib/pricing-model';
import s from './pricing-visualizer.module.css';

const plans = ['intro', 'pro'] as const;
const names = { intro: 'Intro', pro: 'Pro' };
const money = (cents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0,
}).format(cents / 100);

function initialModel(): PricingModel {
  return {
    sustainedAgents: 20, peakDailyAgents: 20,
    humans: 2, devices: 5,
    monthlyBase: {
      intro: displayedPrice(pricingTiers.find((tier) => tier.key === 'intro')!)!,
      pro: displayedPrice(pricingTiers.find((tier) => tier.key === 'pro')!)!,
    },
    includedAgents: { intro: PLAN_LIMITS.intro.agents!, pro: PLAN_LIMITS.pro.agents! },
    agentRates: { ...AGENT_OVERAGE_RATES },
  };
}

function NumberInput({ id, label, value, max, step = 1, onChange }: {
  id: string; label: string; value: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return (
    <input
      id={id}
      aria-label={label}
      type="number"
      inputMode={step === 1 ? 'numeric' : 'decimal'}
      min={0}
      max={max}
      step={step}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const next = event.target.valueAsNumber;
        if (Number.isFinite(next) && next >= 0 && next <= max && (step !== 1 || Number.isInteger(next))) {
          onChange(Math.round(next / step) * step);
        }
      }}
      onBlur={() => {
        const next = draft.trim() === '' || !Number.isFinite(Number(draft)) ? value : Number(draft);
        const normalized = Math.round(Math.min(max, Math.max(0, next)) / step) * step;
        setDraft(String(normalized));
        onChange(normalized);
      }}
    />
  );
}

export function PricingVisualizer({ period }: { period: BillingPeriod }) {
  const [model, setModel] = useState(initialModel);
  const [resetKey, setResetKey] = useState(0);
  const active = model.sustainedAgents;
  const estimates = { intro: estimatePlan('intro', model, period), pro: estimatePlan('pro', model, period) };
  const selected = estimateAutomaticPlan(model, period);
  const estimate = selected.estimate;
  const annual = period === 'annual';
  const unit = annual ? 'year' : 'month';
  const maxX = Math.min(500, Math.max(120, Math.ceil(active * 1.25 / 20) * 20));
  const points = scaleCurve(model, period, maxX).map((point) => ({
    ...point, automatic: point.automatic * (annual ? 12 : 1),
  }));
  const tickSize = annual ? 100000 : 10000;
  const maxY = Math.max(tickSize, Math.ceil(Math.max(...points.map((point) => point.automatic)) / tickSize) * tickSize);
  const x = (count: number) => 76 + count / maxX * 550;
  const y = (cents: number) => 220 - cents / maxY * 180;

  function setActive(value: number) {
    setModel((current) => ({ ...current, sustainedAgents: value, peakDailyAgents: value }));
  }

  return (
    <section className={s.visualizer} aria-labelledby="pricing-model-title" id="pricing-model">
      <div className={s.heading}>
        <h2 id="pricing-model-title">Estimate your cost.</h2>
      </div>
      <form onSubmit={(event) => event.preventDefault()}>
        <div className={s.workspace}>
          <div className={s.usageControl}>
            <div className={s.controlLabel}>
              <label htmlFor="model-active-agents">Active agents</label>
              <NumberInput id="model-active-agents" label="Active agents" value={active} max={500} onChange={setActive} />
            </div>
            <input type="range" aria-label="Active agents slider" min={0} max={500} value={active} onChange={(event) => setActive(event.target.valueAsNumber)} />
            <div className={s.rangeLabels} aria-hidden="true"><span>0</span><span>500</span></div>
          </div>
          <div className={s.results}>
            <p className={s.period}>{annual ? 'Estimated yearly cost' : 'Estimated monthly cost'}</p>
            <div className={s.total} role="status">
              <h3>{names[selected.plan]}</h3>
              <p className={s.amount}>{money(estimate.totalCents)}<span>/{annual ? 'yr' : 'mo'}</span></p>
              <p className={s.comparison}>{selected.upgraded
                ? `Auto-upgrade to Pro · saves ${money(selected.savingsCents)}/${annual ? 'yr' : 'mo'}`
                : 'Automatically upgrades to Pro when it costs less.'}</p>
            </div>
            {estimates.pro.enterpriseSuggested && <p className={s.enterprisePrompt}>More than 100 active agents? <a href={SALES_HREF}>Talk to us about Enterprise</a>.</p>}
          </div>
        </div>
        <div className={s.options}>
          <details>
            <summary>Price details</summary>
            <p className={s.formula}>{money(estimate.baseCents)} base + {money(estimate.overageCents)} overage = {money(estimate.totalCents)}/{annual ? 'yr' : 'mo'}</p>
            {annual && <p className={s.detail}>{money(estimate.baseCents)}/yr base + {money(estimate.monthlyOverageCents)}/mo overage.</p>}
            <p className={s.detail}>{estimate.included} agents included{estimate.blocks > 0 ? ` + ${estimate.blocks} extra ${estimate.blocks === 1 ? 'block' : 'blocks'} of ${AGENT_BLOCK_SIZE}` : ' · no overage'}.</p>
            <p className={s.detail}>The estimate switches from Intro to Pro when Pro costs less. Annual comparisons use ongoing yearly costs.</p>
          </details>
          <details>
            <summary>How agents are counted</summary>
            <div className={s.explanation}>
              <p>Use the greater of: agents that sent messages on at least 3 days in a month, or the highest number that sent messages on a single day. Count each agent once using a stable identity, even when its worker ID changes.</p>
              <p>Extra agents come in blocks of {AGENT_BLOCK_SIZE}: {money(estimates.intro.blockPriceCents)}/month on Intro and {money(estimates.pro.blockPriceCents)}/month on Pro. Humans and devices have no overage charges.</p>
              <p>Annual estimates include the annual base plus 12 months of overage at this usage. Actual overage is calculated monthly, so your first-year bill may differ.</p>
            </div>
          </details>
          <details>
            <summary>View growth chart</summary>
            <p className={s.detail}>Estimated cost per {unit}, assuming ongoing usage.</p>

            <div className={s.chart}>
              <svg viewBox="0 0 660 270" role="img" aria-labelledby="scale-chart-title scale-chart-description">
                <title id="scale-chart-title">Cost as active agents grow</title>
                <desc id="scale-chart-description">At {active} active agents, the estimate selects {names[selected.plan]} at {money(estimate.totalCents)} per {unit}, automatically upgrading from Intro when Pro costs less.</desc>
                {[0, 1, 2, 3, 4].map((tick) => <g key={tick}>
                  <line x1={76} x2={626} y1={y(tick * maxY / 4)} y2={y(tick * maxY / 4)} className={s.gridLine} />
                  <text x={64} y={y(tick * maxY / 4) + 5} textAnchor="end">{money(tick * maxY / 4)}</text>
                  <text x={x(tick * maxX / 4)} y={246} textAnchor="middle">{Math.round(tick * maxX / 4)}</text>
                </g>)}
                <line x1={x(active)} x2={x(active)} y1={32} y2={220} className={s.currentLine} />
                <g className={s.priceLine}>
                  <path d={points.map((point, index) => index === 0 ? `M ${x(point.count)} ${y(point.automatic)}` : `H ${x(point.count)} V ${y(point.automatic)}`).join(' ')} />
                  <circle cx={x(active)} cy={y(estimate.totalCents)} r={5} />
                </g>
                <text x={350} y={267} textAnchor="middle">Active agents</text>
              </svg>
            </div>
          </details>
          <details>
            <summary>Adjust pricing assumptions</summary>
            <p className={s.detail}>Explore different rates and allowances. These changes only affect this estimate.</p>
            <div className={s.assumptions} key={resetKey}>
              {plans.map((plan) => <fieldset key={plan}>
                <legend>{names[plan]}</legend>
                {(['includedAgents', 'agentRates', 'monthlyBase'] as const).map((field) => {
                  const label = field === 'includedAgents' ? 'Included agents' : field === 'agentRates' ? 'Per extra agent / month' : 'Base / month';
                  return <div className={s.rateRow} key={field}>
                    <label htmlFor={`${field}-${plan}`}>{label}</label>
                    <NumberInput id={`${field}-${plan}`} label={`${names[plan]} ${label}`} value={model[field][plan]} max={field === 'includedAgents' ? 500 : 10000} step={field === 'includedAgents' ? 1 : 0.01} onChange={(value) => setModel((current) => ({ ...current, [field]: { ...current[field], [plan]: value } }))} />
                  </div>;
                })}
              </fieldset>)}
            </div>
            <div className={s.assumptionsFooter}>
              <p className={s.detail}>Annual base includes two months free. Overage is billed monthly at the full rate.</p>
              <button type="button" className={s.reset} onClick={() => {
                setModel((current) => ({ ...initialModel(), sustainedAgents: current.sustainedAgents, peakDailyAgents: current.peakDailyAgents }));
                setResetKey((key) => key + 1);
              }}>Reset assumptions</button>
            </div>
          </details>
        </div>
      </form>
      <p className={s.proposal}>Proposed pricing · estimates only.</p>
    </section>
  );
}
