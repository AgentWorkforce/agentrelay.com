import { describe, expect, it } from 'vitest';

import { getProductDocSlugs, productSections, relayflowsSection } from '../product-docs';
import { getDoc } from '../docs';

describe('Product docs sections', () => {
  it('is Flows', () => {
    expect(productSections.map((section) => section.id)).toEqual(['relayflows']);
  });

  it('have content for every navigation slug', () => {
    for (const section of productSections) {
      for (const slug of getProductDocSlugs(section)) {
        expect(getDoc(`${section.id}/${slug}`), `${section.id}/${slug}`).not.toBeNull();
      }
    }
  });
});

describe('Flows product docs', () => {
  it('lists plugins next to recommended flows', () => {
    const goingFurther = relayflowsSection.nav.find((group) => group.title === 'Going further');

    expect(goingFurther?.items).toContainEqual({ title: 'Plugins', slug: 'plugins' });
    expect(getProductDocSlugs(relayflowsSection)).toContain('plugins');
  });
});
