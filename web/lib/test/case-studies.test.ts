import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAllCaseStudies, getCaseStudy } from '../case-studies';

afterEach(() => vi.unstubAllEnvs());

describe('case studies', () => {
  it('keeps unpublished studies out of public listings', () => {
    expect(getAllCaseStudies().some((study) => study.slug === 'pomerado')).toBe(false);
  });

  it('treats unpublished studies as missing outside local development', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(getCaseStudy('pomerado')).toBeNull();
  });

  it('allows unpublished studies on the local development server', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(getCaseStudy('pomerado')?.frontmatter.published).toBe(false);
  });
});
