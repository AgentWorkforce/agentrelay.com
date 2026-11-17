import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  extractCaseStudyToc,
  getAllCaseStudies,
  getCaseStudy,
  getCaseStudyDraft,
  getListedCaseStudies,
} from '../case-studies';

afterEach(() => vi.unstubAllEnvs());

describe('case studies', () => {
  it('keeps unpublished studies out of public listings', () => {
    expect(getAllCaseStudies().some((study) => study.slug === 'pomerado')).toBe(false);
  });

  it('treats unpublished studies as missing in public slug lookups', () => {
    expect(getCaseStudy('pomerado')).toBeNull();
  });

  it('allows an explicit draft lookup only on the local development server', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(getCaseStudy('pomerado')).toBeNull();
    expect(getCaseStudyDraft('pomerado')?.frontmatter.published).toBe(false);
  });

  it('does not expose drafts in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CASE_STUDY_DRAFTS', '');

    expect(getCaseStudyDraft('pomerado')).toBeNull();
    expect(getListedCaseStudies().some((study) => study.slug === 'pomerado')).toBe(false);
  });

  it('lists and resolves drafts in PR preview builds', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CASE_STUDY_DRAFTS', '1');

    expect(getCaseStudy('pomerado')).toBeNull();
    expect(getCaseStudyDraft('pomerado')?.frontmatter.published).toBe(false);
    expect(getListedCaseStudies().some((study) => study.slug === 'pomerado')).toBe(true);
    expect(getAllCaseStudies().some((study) => study.slug === 'pomerado')).toBe(false);
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
