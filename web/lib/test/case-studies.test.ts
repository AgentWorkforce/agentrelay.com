import { afterEach, describe, expect, it, vi } from 'vitest';

import { extractCaseStudyToc, getAllCaseStudies, getCaseStudy } from '../case-studies';

afterEach(() => vi.unstubAllEnvs());

describe('case studies', () => {
  it('keeps unpublished studies out of public listings', () => {
    expect(getAllCaseStudies().some((study) => study.slug === 'pomerado')).toBe(false);
  });

  it('treats unpublished studies as missing in public slug lookups', () => {
    expect(getCaseStudy('pomerado')).toBeNull();
  });

  it('does not expose unpublished studies from a local development route', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(getCaseStudy('pomerado')).toBeNull();
  });

  it('uses visible link text for both TOC labels and heading IDs', () => {
    expect(extractCaseStudyToc('## [Setup](/docs) and `configuration`')).toEqual([
      { id: 'setup-and-configuration', text: 'Setup and configuration', level: 2 },
    ]);
  });

  it('ignores heading-like lines inside fenced code blocks', () => {
    expect(extractCaseStudyToc('```md\n## Not a heading\n```\n### Real heading')).toEqual([
      { id: 'real-heading', text: 'Real heading', level: 3 },
    ]);
  });
});
