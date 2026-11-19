import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));
vi.mock('../../components/GitHubStars', () => ({ GitHubStarsBadge: () => null }));

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
  billedPrice,
  pricingCta,
  limitLines,
  pricingTiers,
  showsBetaPrice,
} from '../pricing';

const html = renderToStaticMarkup(<PricingPage />);

describe('pricing page', () => {
  it('shows all four tiers with their limits', () => {
    expect(html).toContain('>Free<');
    expect(html).toContain('1 device');
    expect(html).toContain('3 active agents');
    expect(html).toContain('1 human');
    expect(html).toContain('1-day session history');
    expect(html).toContain('>Intro<');
    expect(html).toContain('>Pro<');
    expect(html).toContain('>Enterprise<');
    expect(html).toContain('5 devices');
    expect(html).toContain('15 active agents');
    expect(html).toContain('2 humans');
    expect(html).toContain('7-day session history');
    expect(html).toContain('15 devices');
    expect(html).toContain('40 active agents');
    expect(html).toContain('10 humans');
    expect(html).toContain('14-day session history');
    expect(html).toContain('Unlimited devices');
    expect(html).toContain('Unlimited active agents');
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
    const text = html.replace(/<[^>]*>/g, '').toLowerCase();
    expect(text).not.toContain('relaycast');
    expect(text).not.toContain('broker');
  });

  it('has a canonical URL and appears in the sitemap', () => {
    expect(metadata.title).toBe('Pricing');
    expect(metadata.alternates?.canonical).toBe('https://agentrelay.com/pricing');
    expect(sitemap().map((entry) => entry.url)).toContain('https://agentrelay.com/pricing');
  });
});

describe('pricing data', () => {
  it('bills ten months for an annual term, including when beta pricing ends', () => {
    const [free, intro, pro, enterprise] = pricingTiers;
    expect(billedPrice(free, 'monthly')).toBe(0);
    expect(billedPrice(free, 'annual')).toBe(0);
    expect(showsBetaPrice(free)).toBe(false);
    expect(billedPrice(intro, 'annual', true)).toBe(490);
    expect(billedPrice(pro, 'annual', true)).toBe(990);
    expect(billedPrice(intro, 'annual', false)).toBe(990);
    expect(billedPrice(pro, 'annual', false)).toBe(1990);
    expect(billedPrice(intro, 'monthly', true)).toBe(49);
    expect(billedPrice(pro, 'monthly', true)).toBe(99);
    expect(billedPrice(enterprise, 'annual')).toBeNull();
  });

  it('preserves the CTA and carries annual billing through the sign-in redirect', () => {
    for (const tier of pricingTiers) {
      const annual = pricingCta(tier, 'annual');
      expect(annual.label).toBe(tier.cta.label);
      if (tier.key === 'enterprise') {
        expect(annual.href).toBe(SALES_HREF);
      } else if (tier.key === 'free') {
        expect(annual).toEqual(tier.cta);
        expect(annual.href).toBe(googleSignInHref({ next: '/onboarding/plan?plan=free' }));
      } else {
        const url = new URL(annual.href, 'https://agentrelay.com');
        expect(url.pathname).toBe('/cloud/api/auth/google/start');
        const next = new URL(url.searchParams.get('next')!, 'https://agentrelay.com');
        expect(next.pathname).toBe('/onboarding/plan');
        expect(next.searchParams.get('plan')).toBe(tier.key);
        expect(next.searchParams.get('billing')).toBe('annual');
      }
      expect(pricingCta(tier, 'monthly')).toEqual(tier.cta);
    }
  });

  it('matches the proposed plan allowances', () => {
    expect(PLAN_LIMITS).toEqual({
      free: { devices: 1, agents: 3, humans: 1, session_retention_days: 1 },
      intro: { devices: 5, agents: 15, humans: 2, session_retention_days: 7 },
      pro: { devices: 15, agents: 40, humans: 10, session_retention_days: 14 },
      enterprise: { devices: null, agents: null, humans: null, session_retention_days: 365 },
    });
    expect(pricingTiers.map((tier) => tier.key)).toEqual(['free', 'intro', 'pro', 'enterprise']);
    expect(pricingTiers.filter((tier) => tier.highlighted).map((tier) => tier.key)).toEqual(['pro']);
  });

  it('is a single switch: beta off shows list prices with no strikethrough', () => {
    const [, intro, pro, enterprise] = pricingTiers;
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
      'Unlimited active agents',
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
    expect(doc?.content).toContain('Overage applies as soon as active agents exceed');
    expect(doc?.content).toContain('no added charge or hard block');
    expect(doc?.content).toContain('Existing customers keep their current access');
    expect(sitemap().map((entry) => entry.url)).toContain('https://agentrelay.com/docs/plans-and-limits');
  });
});
