import { describe, expect, it } from 'vitest';

import sitemap from '../../app/sitemap';
import { productBasePath, productSections } from '../product-docs-nav';
import { absoluteUrl } from '../site';

const urls = sitemap().map((entry) => entry.url);

describe('sitemap', () => {
  it('lists every page in each product docs sidebar', () => {
    for (const section of productSections) {
      for (const item of section.nav.flatMap((group) => group.items)) {
        expect(urls).toContain(absoluteUrl(`${productBasePath(section)}/${item.slug}`));
      }
    }
  });

  it('leaves out unlisted agent briefs and removed docs sections', () => {
    expect(urls).not.toContain(absoluteUrl('/docs/file/review-bot-brief'));
    expect(urls.filter((url) => /\/docs\/(loop|agents|factory)(\/|$)/.test(url))).toEqual([]);
  });

  it('has no duplicate URLs', () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});
