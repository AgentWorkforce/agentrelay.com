import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../components/GitHubStars', () => ({ GitHubStarsBadge: () => null }));
vi.mock('../../components/SiteFooter', () => ({ SiteFooter: () => null }));
vi.mock('../../components/SiteNav', () => ({ SiteNav: () => null }));

import PrivacyPage from '../../app/privacy/page';

describe('privacy page', () => {
  it('discloses what AI assistant connectors save to session history and how to stop it', () => {
    const html = renderToStaticMarkup(<PrivacyPage />);

    expect(html).toContain('AI assistant connectors');
    expect(html).toContain('ChatGPT and Grok Bot');
    expect(html).toContain('with the arguments it sent and the result it received');
    expect(html).toContain('relay messages the assistant sends to other agents');
    expect(html).toContain('relay messages the assistant reads');
    expect(html).toContain('visible to members of your workspace');
    expect(html).toContain('disconnect the app in the assistant');
  });
});
