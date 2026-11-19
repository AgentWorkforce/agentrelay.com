import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';

describe('pricing links', () => {
  it('appear in the site nav', () => {
    const html = renderToStaticMarkup(<SiteNav />);
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('>Pricing<');
  });

  it('appear in the site footer', () => {
    const html = renderToStaticMarkup(<SiteFooter />);
    expect(html).toContain('href="/pricing"');
    expect(html).toContain('>Pricing<');
  });
});
