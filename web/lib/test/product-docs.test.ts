import { describe, expect, it } from 'vitest';

import { factorySection, getProductSearchIndex } from '../product-docs';

describe('Factory product docs', () => {
  it('publishes issue routing in navigation and scoped search', () => {
    const navItems = factorySection.nav.flatMap((group) => group.items);

    expect(navItems).toContainEqual({
      title: 'Issue labels & routing',
      slug: 'issue-routing',
    });

    const searchEntry = getProductSearchIndex(factorySection).find(
      (entry) => entry.slug === 'issue-routing'
    );

    expect(searchEntry).toMatchObject({
      title: 'Issue labels and repository routing',
    });
    expect(searchEntry?.headings).toContain('Execution-shape labels');
    expect(searchEntry?.body).toContain('safety.requireLabel');
  });
});
