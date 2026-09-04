import { describe, expect, it } from 'vitest';

import {
  factorySection,
  fileSection,
  getProductDocSlugs,
  getProductSearchIndex,
} from '../product-docs';

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
