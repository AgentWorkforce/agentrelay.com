import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));

import sitemap from '../../app/sitemap';
import PricingPage, { metadata } from '../../app/pricing/page';
import { docsNav } from '../docs-nav';
import { getDoc } from '../docs';
import { googleSignInHref } from '../login';
import {
  BETA_PRICING_ACTIVE,
  BETA_PRICING_NOTE,
  PLAN_LIMITS,
  SALES_HREF,
  displayedPrice,
  limitLines,
  pricingTiers,
  showsBetaPrice,
} from '../pricing';

const html = renderToStaticMarkup(<PricingPage />);

describe('pricing page', () => {
  it('shows the three tiers with the contract limits', () => {
    expect(html).toContain('>Intro<');
    expect(html).toContain('>Pro<');
    expect(html).toContain('>Enterprise<');
    expect(html).toContain('5 devices');
    expect(html).toContain('15 agents');
    expect(html).toContain('2 humans');
    expect(html).toContain('7-day session history');
    expect(html).toContain('15 devices');
    expect(html).toContain('60 agents');
    expect(html).toContain('10 humans');
    expect(html).toContain('14-day session history');
    expect(html).toContain('Unlimited devices');
    expect(html).toContain('Unlimited agents');
    expect(html).toContain('Unlimited humans');
    expect(html).toContain('1 year of session history');
  });

  it('shows beta pricing with the list price struck through while the beta is on', () => {
    expect(BETA_PRICING_ACTIVE).toBe(true);
    expect(html).toContain('$99');
    expect(html).toContain('$49');
    expect(html).toContain('$199');
    expect(html).toContain('List price </span>$99');
    expect(html).toContain('List price </span>$199');
    expect(html).toContain(BETA_PRICING_NOTE);
  });

  it('sends Intro and Pro through Google sign-in to plan selection, and Enterprise to sales', () => {
    const intro = googleSignInHref({ next: '/onboarding/plan?plan=intro' });
    const pro = googleSignInHref({ next: '/onboarding/plan?plan=pro' });
    expect(intro).toBe('/cloud/api/auth/google/start?next=%2Fonboarding%2Fplan%3Fplan%3Dintro');
    expect(html).toContain(`href="${intro.replace(/&/g, '&amp;')}"`);
    expect(html).toContain(`href="${pro.replace(/&/g, '&amp;')}"`);
    expect(html).toContain(`href="${SALES_HREF}"`);
    expect(html).toContain('Talk to us');
  });

  it('answers the four FAQ questions, with existing customers keeping their access', () => {
    expect(html).toContain('What counts as a device?');
    expect(html).toContain('What happens when I reach a limit?');
    expect(html).toContain('Can I change plans?');
    expect(html).toContain('How do limits apply to existing customers?');
    expect(html).toContain('Existing customers keep their current access.');
  });

  it('uses the customer-facing product name only', () => {
    expect(html.toLowerCase()).not.toContain('relaycast');
    expect(html.toLowerCase()).not.toContain('broker');
  });

  it('has a canonical URL and appears in the sitemap', () => {
    expect(metadata.title).toBe('Pricing');
    expect(metadata.alternates?.canonical).toBe('https://agentrelay.com/pricing');
    expect(sitemap().map((entry) => entry.url)).toContain('https://agentrelay.com/pricing');
  });
});

describe('pricing data', () => {
  it('matches the canonical plan limits', () => {
    expect(PLAN_LIMITS).toEqual({
      intro: { devices: 5, agents: 15, humans: 2, session_retention_days: 7 },
      pro: { devices: 15, agents: 60, humans: 10, session_retention_days: 14 },
      enterprise: { devices: null, agents: null, humans: null, session_retention_days: 365 },
    });
    expect(pricingTiers.map((tier) => tier.key)).toEqual(['intro', 'pro', 'enterprise']);
    expect(pricingTiers.filter((tier) => tier.highlighted).map((tier) => tier.key)).toEqual(['pro']);
  });

  it('is a single switch: beta off shows list prices with no strikethrough', () => {
    const [intro, pro, enterprise] = pricingTiers;
    expect(displayedPrice(intro, true)).toBe(49);
    expect(displayedPrice(pro, true)).toBe(99);
    expect(displayedPrice(intro, false)).toBe(99);
    expect(displayedPrice(pro, false)).toBe(199);
    expect(displayedPrice(enterprise, true)).toBeNull();
    expect(showsBetaPrice(intro, true)).toBe(true);
    expect(showsBetaPrice(intro, false)).toBe(false);
    expect(showsBetaPrice(enterprise, true)).toBe(false);
  });

  it('renders enterprise limits as unlimited with one year of history', () => {
    expect(limitLines(PLAN_LIMITS.enterprise)).toEqual([
      'Unlimited devices',
      'Unlimited agents',
      'Unlimited humans',
      '1 year of session history',
    ]);
  });
});

describe('plans and limits docs page', () => {
  it('is in the docs nav and loads', () => {
    const slugs = docsNav.flatMap((group) => group.items.map((item) => item.slug));
    expect(slugs).toContain('plans-and-limits');
    const doc = getDoc('plans-and-limits');
    expect(doc?.frontmatter.title).toBe('Plans and limits');
    expect(doc?.content).toContain('plan_limit_exceeded');
    expect(doc?.content).toContain('Existing customers keep their current access');
    expect(sitemap().map((entry) => entry.url)).toContain('https://agentrelay.com/docs/plans-and-limits');
  });
});
