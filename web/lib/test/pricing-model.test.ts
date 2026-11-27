import { describe, expect, it } from 'vitest';
import { activeAgents, estimateAutomaticPlan, estimatePlan, scaleCurve, type PricingModel } from '../pricing-model';

const model: PricingModel = {
  sustainedAgents: 15, peakDailyAgents: 15,
  humans: 2, devices: 5,
  monthlyBase: { intro: 49, pro: 99 },
  includedAgents: { intro: 15, pro: 40 },
  agentRates: { intro: 3, pro: 2 },
};
const at = (count: number): PricingModel => ({
  ...model, sustainedAgents: count, peakDailyAgents: count,
});

describe('active-agent pricing model', () => {
  it('takes the larger count without adding or double-counting the two groups', () => {
    expect(activeAgents({ ...model, sustainedAgents: 33, peakDailyAgents: 22 })).toBe(33);
    expect(activeAgents({ ...model, sustainedAgents: 22, peakDailyAgents: 33 })).toBe(33);
    expect(estimatePlan('pro', at(33), 'monthly').overageCents).toBe(0);
    expect(estimatePlan('pro', at(22), 'monthly').overageCents).toBe(0);
  });

  it.each([[0, 0], [15, 0], [16, 1], [20, 1], [21, 2], [25, 2], [26, 3]])(
    'rounds %i Intro active agents to %i billed five-agent blocks', (count, blocks) => {
      const result = estimatePlan('intro', at(count), 'monthly');
      expect(result.blocks).toBe(blocks);
      expect(result.monthlyOverageCents).toBe(blocks * 1500);
    },
  );

  it.each([[40, 0], [41, 1], [45, 1], [46, 2], [60, 4], [100, 12]])(
    'rounds %i Pro active agents to %i billed five-agent blocks', (count, blocks) => {
      expect(estimatePlan('pro', at(count), 'monthly').monthlyOverageCents).toBe(blocks * 1000);
    },
  );

  it.each([['intro', 20, 67000], ['intro', 25, 85000], ['pro', 60, 147000], ['pro', 100, 243000]] as const)(
    'matches the ongoing annual example for %s at %i agents', (plan, count, total) => {
      expect(estimatePlan(plan, at(count), 'annual').totalCents).toBe(total);
    },
  );

  it('crosses over at 26 agents annually and 31 monthly', () => {
    for (const [period, crossover] of [['annual', 26], ['monthly', 31]] as const) {
      expect(estimatePlan('intro', at(crossover - 1), period).totalCents).toBeLessThan(estimatePlan('pro', at(crossover - 1), period).totalCents);
      expect(estimatePlan('intro', at(crossover), period).totalCents).toBeGreaterThan(estimatePlan('pro', at(crossover), period).totalCents);
    }
  });

  it('charges overage immediately above each plan allowance', () => {
    expect(estimatePlan('intro', at(16), 'monthly').monthlyOverageCents).toBe(1500);
    expect(estimatePlan('pro', at(41), 'monthly').monthlyOverageCents).toBe(1000);
    expect(estimatePlan('intro', at(60), 'monthly').monthlyOverageCents).toBe(13500);
    expect(estimatePlan('pro', at(60), 'monthly').monthlyOverageCents).toBe(4000);
  });

  it('includes current overage without discounting it annually', () => {
    expect(estimatePlan('intro', at(20), 'monthly').totalCents).toBe(6400);
    expect(estimatePlan('intro', at(20), 'annual').overageCents).toBe(18000);
  });

  it('never charges humans or devices, even when both exceed their plan allowances', () => {
    const result = estimatePlan('pro', { ...at(40), humans: 500, devices: 500 }, 'monthly');
    expect(result.totalCents).toBe(9900);
    expect(result.softLimits.map((limit) => limit.extra)).toEqual([490, 485]);
  });

  it('suggests Enterprise only above 100 active agents', () => {
    expect(estimatePlan('pro', at(100), 'monthly').enterpriseSuggested).toBe(false);
    expect(estimatePlan('pro', at(101), 'monthly').enterpriseSuggested).toBe(true);
  });

  it('supports editable allowances and fractional rates with exact cent arithmetic', () => {
    const scenario = { ...at(33), includedAgents: { intro: 15, pro: 30 }, agentRates: { intro: 3, pro: 0.1 } };
    expect(estimatePlan('pro', scenario, 'monthly').monthlyOverageCents).toBe(50);
  });

  it('plots every block boundary with immediate overage', () => {
    const points = scaleCurve(at(20), 'annual', 120);
    expect(points[15].intro).toBeCloseTo(49000 / 12);
    expect(points[16].intro).toBeCloseTo(67000 / 12);
    expect(points[20].intro).toBe(points[16].intro);
    expect(points[21].intro).toBeCloseTo(85000 / 12);
    const monthly = scaleCurve(at(20), 'monthly', 120);
    expect(monthly[100].intro).toBe(30400);
    expect(monthly[100].pro).toBe(21900);
  });
});

describe('automatic Intro to Pro upgrade', () => {
  it.each([['annual', 26, 99000], ['monthly', 31, 9900]] as const)('switches at the %s crossover', (period, count, price) => {
    expect(estimateAutomaticPlan(at(count - 1), period).plan).toBe('intro');
    const result = estimateAutomaticPlan(at(count), period);
    expect(result.plan).toBe('pro');
    expect(result.upgraded).toBe(true);
    expect(result.estimate.totalCents).toBe(price);
    expect(result.savingsCents).toBeGreaterThan(0);
  });

  it('upgrades immediately when current usage makes Pro cheaper', () => {
    const result = estimateAutomaticPlan(at(60), 'monthly');
    expect(result.plan).toBe('pro');
    expect(result.estimate.totalCents).toBe(13900);
  });

  it('uses edited prices and keeps the current plan on a tie', () => {
    const scenario = { ...at(20), monthlyBase: { intro: 49, pro: 64 } };
    expect(estimateAutomaticPlan(scenario, 'monthly').upgraded).toBe(false);
    expect(estimateAutomaticPlan({ ...scenario, monthlyBase: { intro: 49, pro: 63 } }, 'monthly').plan).toBe('pro');
  });

  it('does not downgrade an existing Pro subscription', () => {
    const result = estimateAutomaticPlan(at(5), 'monthly', 'pro');
    expect(result.plan).toBe('pro');
    expect(result.upgraded).toBe(false);
    expect(result.savingsCents).toBe(0);
  });

  it('plots the automatically selected cost at both crossover boundaries', () => {
    const annual = scaleCurve(at(26), 'annual', 40);
    expect(annual[25].automatic).toBeCloseTo(85000 / 12);
    expect(annual[26].automatic).toBeCloseTo(99000 / 12);
    const monthly = scaleCurve(at(31), 'monthly', 40);
    expect(monthly[30].automatic).toBe(9400);
    expect(monthly[31].automatic).toBe(9900);
  });
});
