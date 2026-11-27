import { AGENT_BLOCK_SIZE, ENTERPRISE_AGENT_THRESHOLD, PLAN_LIMITS, type BillingPeriod } from './pricing';

export type ModelPlan = 'intro' | 'pro';
export type PricingModel = {
  sustainedAgents: number;
  peakDailyAgents: number;
  humans: number;
  devices: number;
  monthlyBase: Record<ModelPlan, number>;
  includedAgents: Record<ModelPlan, number>;
  agentRates: Record<ModelPlan, number>;
};

export function activeAgents(model: PricingModel): number {
  return Math.max(model.sustainedAgents, model.peakDailyAgents);
}

export function estimatePlan(plan: ModelPlan, model: PricingModel, period: BillingPeriod) {
  const active = activeAgents(model);
  const included = model.includedAgents[plan];
  const extra = Math.max(0, active - included);
  const blocks = Math.ceil(extra / AGENT_BLOCK_SIZE);
  const blockPriceCents = Math.round(model.agentRates[plan] * 100) * AGENT_BLOCK_SIZE;
  const monthlyOverageCents = blocks * blockPriceCents;
  const baseCents = Math.round(model.monthlyBase[plan] * 100) * (period === 'annual' ? 10 : 1);
  const overageCents = monthlyOverageCents * (period === 'annual' ? 12 : 1);
  const totalCents = baseCents + overageCents;
  const softLimits = (['humans', 'devices'] as const).map((resource) => ({
    resource,
    included: PLAN_LIMITS[plan][resource] ?? 0,
    extra: Math.max(0, model[resource] - (PLAN_LIMITS[plan][resource] ?? 0)),
  }));
  return {
    active, included, extra, blocks, blockPriceCents,
    monthlyOverageCents, baseCents, overageCents, totalCents, softLimits,
    monthlyEquivalentCents: totalCents / (period === 'annual' ? 12 : 1),
    enterpriseSuggested: active > ENTERPRISE_AGENT_THRESHOLD,
  };
}

export function estimateAutomaticPlan(model: PricingModel, period: BillingPeriod, currentPlan: ModelPlan = 'intro'): {
  plan: ModelPlan; upgraded: boolean; estimate: ReturnType<typeof estimatePlan>; savingsCents: number;
} {
  const intro = estimatePlan('intro', model, period);
  const pro = estimatePlan('pro', model, period);
  const upgraded = currentPlan === 'intro' && pro.totalCents < intro.totalCents;
  const plan = currentPlan === 'pro' || upgraded ? 'pro' : 'intro';
  return { plan, upgraded, estimate: plan === 'pro' ? pro : intro, savingsCents: upgraded ? intro.totalCents - pro.totalCents : 0 };
}

export function scaleCurve(model: PricingModel, period: BillingPeriod, max: number) {
  return Array.from({ length: max + 1 }, (_, count) => {
    const scenario = {
      ...model,
      sustainedAgents: count,
      peakDailyAgents: 0,
    };
    return {
      count,
      automatic: estimateAutomaticPlan(scenario, period).estimate.monthlyEquivalentCents,
      intro: estimatePlan('intro', scenario, period).monthlyEquivalentCents,
      pro: estimatePlan('pro', scenario, period).monthlyEquivalentCents,
    };
  });
}
