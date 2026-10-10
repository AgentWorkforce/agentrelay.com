import { describe, expect, it } from 'vitest';

import {
  fileSection,
  getProductDocSlugs,
  getProductSearchIndex,
  productSections,
  relayflowsSection,
  relayhistorySection,
} from '../product-docs';
import { getDoc } from '../docs';

describe('Product docs sections', () => {
  it('are Relayfile, Relayhistory and Flows', () => {
    expect(productSections.map((section) => section.id)).toEqual(['file', 'relayhistory', 'relayflows']);
  });

  it('have content for every navigation slug', () => {
    for (const section of productSections) {
      for (const slug of getProductDocSlugs(section)) {
        expect(getDoc(`${section.id}/${slug}`), `${section.id}/${slug}`).not.toBeNull();
      }
    }
  });
});

describe('Relayhistory product docs', () => {
  it('shows the ai-hist package version', () => {
    expect(relayhistorySection.npmPackage).toBe('ai-hist');
  });

  it('indexes the handoff guide in scoped search', () => {
    const searchEntry = getProductSearchIndex(relayhistorySection).find((entry) => entry.slug === 'handoffs');

    expect(searchEntry).toMatchObject({ title: 'Handoffs' });
    expect(searchEntry?.headings).toEqual(expect.arrayContaining(['Send', 'Receive', 'Scope']));
  });
});

describe('Relayfile product docs', () => {
  it('lists only the human guide in the sidebar', () => {
    const guides = fileSection.nav.find((group) => group.title === 'Guides');

    expect(guides?.items).toEqual([{ title: 'Build a PR review bot', slug: 'review-bot' }]);
  });

  it('still builds and indexes the agent brief, unlisted', () => {
    const navSlugs = fileSection.nav.flatMap((group) => group.items.map((item) => item.slug));

    expect(navSlugs).not.toContain('review-bot-brief');
    expect(fileSection.unlistedSlugs).toContain('review-bot-brief');
    // getProductDocSlugs drives the page, og and markdown routes, so the .md
    // endpoint the guide links to must stay in it.
    expect(getProductDocSlugs(fileSection)).toContain('review-bot-brief');
  });

  it('indexes the review-bot guide, including the cloud path', () => {
    const searchEntry = getProductSearchIndex(fileSection).find(
      (entry) => entry.slug === 'review-bot'
    );

    expect(searchEntry).toMatchObject({ title: 'Build a PR review bot' });
    expect(searchEntry?.headings).toContain('5. Give every sandbox the same workspace');
    expect(searchEntry?.headings).toContain('Where it runs');
    expect(searchEntry?.headings).toContain('Provisioning from a machine with no browser');
    expect(searchEntry?.headings).toContain('Where the cloud process gets its credentials');
    expect(searchEntry?.body).toContain('A PR review bot');
  });

  it('indexes the copy-paste agent brief', () => {
    const searchEntry = getProductSearchIndex(fileSection).find(
      (entry) => entry.slug === 'review-bot-brief'
    );

    expect(searchEntry).toMatchObject({ title: 'Review bot agent brief' });
    expect(searchEntry?.headings).toContain('The run protocol');
    expect(searchEntry?.headings).toContain('Publish the review');
  });
});

describe('Flows product docs', () => {
  it('lists plugins next to recommended flows', () => {
    const goingFurther = relayflowsSection.nav.find((group) => group.title === 'Going further');

    expect(goingFurther?.items).toContainEqual({ title: 'Plugins', slug: 'plugins' });
    expect(getProductDocSlugs(relayflowsSection)).toContain('plugins');
  });
});
