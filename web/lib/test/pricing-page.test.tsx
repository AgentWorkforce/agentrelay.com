import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/GitHubStars', () => ({ GitHubStarsBadge: () => null }));
vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));

import PricingPage from '../../app/pricing/page';
import sitemap from '../../app/sitemap';
import { RELAY_PLANS, SIGN_IN_PATH } from '../pricing';
import { absoluteUrl } from '../site';

const html = renderToStaticMarkup(<PricingPage />);

describe('pricing page', () => {
  it('states local and self-hosted use as unlimited and free', () => {
    expect(html).toContain('Local and self-hosted');
    expect(html).toMatch(/Local and self-hosted[\s\S]*?Unlimited[\s\S]*?Free/);
  });

  it('states the hosted trial and the signed-in free tier', () => {
    expect(html).toContain('100 messages, one time');
    expect(html).toContain('10,000 messages a month');
    expect(html).toContain(`href="${SIGN_IN_PATH}"`);
    expect(html).toContain('agent-relay login');
  });

  it('lists paid plans without inventing prices', () => {
    for (const plan of RELAY_PLANS.filter((p) => p.id === 'pro' || p.id === 'enterprise')) {
      expect(plan.price).toBe('Contact us');
    }
    expect(html).not.toMatch(/\$\d/);
  });

  it('explains the limit error and its upgrade URL', () => {
    expect(html).toContain('plan_limit_exceeded');
    expect(html).toContain('upgrade_url');
  });

  it('is canonical and in the sitemap', () => {
    expect(sitemap().map((entry) => entry.url)).toContain(absoluteUrl('/pricing'));
  });
});
