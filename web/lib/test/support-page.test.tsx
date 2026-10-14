import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/GitHubStars', () => ({ GitHubStarsBadge: () => null }));
vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));

import sitemap from '../../app/sitemap';
import SupportPage, { metadata } from '../../app/support/page';

describe('support page', () => {
  it('publishes the canonical support contact without inviting secrets', () => {
    const html = renderToStaticMarkup(<SupportPage />);

    expect(html).toContain('Agent Relay support');
    expect(html).toContain('mailto:hello@agentrelay.com');
    expect(html).toContain('Do not send workspace keys');
    expect(html).toContain('href="https://github.com/AgentWorkforce"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/terms"');
  });

  it('uses a canonical URL and appears in the sitemap', () => {
    expect(metadata.alternates?.canonical).toBe('https://agentrelay.com/support');
    expect(metadata.title).toBe('Support');
    expect(sitemap().map((entry) => entry.url)).toContain('https://agentrelay.com/support');
  });
});
