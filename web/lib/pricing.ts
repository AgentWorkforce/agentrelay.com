import { googleSignInHref } from './login';

/**
 * Agent Relay plans as the pricing page and docs present them. These are the proposed marketing allowances; Cloud billing enforcement is
 * maintained separately. `null` means unlimited.
 */
export type PlanKey = 'free' | 'intro' | 'pro' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';

const ANNUAL_BILLED_MONTHS = 10;
export const AGENT_BLOCK_SIZE = 5;
export const AGENT_OVERAGE_RATES = { intro: 3, pro: 2 } as const;
export const ENTERPRISE_AGENT_THRESHOLD = 100;

export type PlanLimits = {
  devices: number | null;
  agents: number | null;
  humans: number | null;
  session_retention_days: number | null;
};

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: { devices: 1, agents: 3, humans: 1, session_retention_days: 1 },
  intro: { devices: 5, agents: 15, humans: 2, session_retention_days: 7 },
  pro: { devices: 15, agents: 40, humans: 10, session_retention_days: 14 },
  enterprise: { devices: null, agents: null, humans: null, session_retention_days: 365 },
};

/**
 * Beta pricing switch. While `true`, Intro and Pro show the list price struck
 * through, the beta price, and the beta note. Set it to `false` when the beta
 * ends; nothing else on the site needs to change.
 */
export const BETA_PRICING_ACTIVE = true;

export const BETA_PRICING_NOTE = 'Beta pricing — locked in for as long as you keep your subscription.';

/** Enterprise is sales-led: the CTA books a call instead of starting checkout. */
export const SALES_HREF = 'https://agentrelay.com/will';

export type PricingTier = {
  key: PlanKey;
  name: string;
  tagline: string;
  /** Monthly list price in USD; `null` for sales-only tiers. */
  listPrice: number | null;
  /** Monthly beta price in USD; `null` when the tier has no beta discount. */
  betaPrice: number | null;
  limits: PlanLimits;
  highlighted: boolean;
  cta: { label: string; href: string };
};

export const pricingTiers: readonly PricingTier[] = [
  {
    key: 'free',
    name: 'Free',
    tagline: 'Try Relay on your own.',
    listPrice: 0,
    betaPrice: null,
    limits: PLAN_LIMITS.free,
    highlighted: false,
    cta: { label: 'Start for free', href: googleSignInHref({ next: '/onboarding/plan?plan=free' }) },
  },
  {
    key: 'intro',
    name: 'Intro',
    tagline: 'One builder and a small crew of agents across a few machines.',
    listPrice: 99,
    betaPrice: 49,
    limits: PLAN_LIMITS.intro,
    highlighted: false,
    cta: { label: 'Start with Intro', href: googleSignInHref({ next: '/onboarding/plan?plan=intro' }) },
  },
  {
    key: 'pro',
    name: 'Pro',
    tagline: 'A team of people running a fleet of agents on shared infrastructure.',
    listPrice: 199,
    betaPrice: 99,
    limits: PLAN_LIMITS.pro,
    highlighted: true,
    cta: { label: 'Start with Pro', href: googleSignInHref({ next: '/onboarding/plan?plan=pro' }) },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    tagline: 'For larger teams with custom deployment needs.',
    listPrice: null,
    betaPrice: null,
    limits: PLAN_LIMITS.enterprise,
    highlighted: false,
    cta: { label: 'Talk to us', href: SALES_HREF },
  },
];

/** Price shown on the card: the beta price while the beta is on, else the list price. */
export function displayedPrice(tier: PricingTier, betaActive: boolean = BETA_PRICING_ACTIVE): number | null {
  return betaActive && tier.betaPrice !== null ? tier.betaPrice : tier.listPrice;
}

export function billedPrice(
  tier: PricingTier,
  period: BillingPeriod,
  betaActive: boolean = BETA_PRICING_ACTIVE,
): number | null {
  const monthlyPrice = displayedPrice(tier, betaActive);
  return monthlyPrice === null ? null : monthlyPrice * (period === 'annual' ? ANNUAL_BILLED_MONTHS : 1);
}

export function pricingCta(tier: PricingTier, period: BillingPeriod): PricingTier['cta'] {
  if (period === 'annual' && (tier.key === 'intro' || tier.key === 'pro')) {
    return {
      label: tier.cta.label,
      href: googleSignInHref({ next: `/onboarding/plan?plan=${tier.key}&billing=annual` }),
    };
  }
  return tier.cta;
}

/** True when the card shows the list price struck through next to the beta price. */
export function showsBetaPrice(tier: PricingTier, betaActive: boolean = BETA_PRICING_ACTIVE): boolean {
  return betaActive && tier.betaPrice !== null && tier.listPrice !== null;
}

export function formatCount(value: number | null, noun: { one: string; many: string }): string {
  if (value === null) return `Unlimited ${noun.many}`;
  return `${value} ${value === 1 ? noun.one : noun.many}`;
}

export function formatRetention(days: number | null): string {
  if (days === null) return 'Unlimited session history';
  if (days === 365) return '1 year of session history';
  return `${days}-day session history`;
}

export function limitLines(limits: PlanLimits): readonly string[] {
  return [
    formatCount(limits.devices, { one: 'device', many: 'devices' }),
    formatCount(limits.agents, { one: 'active agent', many: 'active agents' }),
    formatCount(limits.humans, { one: 'human', many: 'humans' }),
    formatRetention(limits.session_retention_days),
  ];
}
