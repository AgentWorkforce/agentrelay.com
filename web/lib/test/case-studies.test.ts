import { afterEach, describe, expect, it, vi } from 'vitest';

// A draft beside the real content, so draft gating is tested without
// depending on whether any real study is still a draft.
const DRAFT = `---
title: 'Draft study'
description: 'Not yet approved.'
date: '2026-01-01'
author: 'Khaliq Gant'
category: 'Case Study'
company: 'Example'
published: false
tags: []
---

Draft body.
`;

vi.mock('../content-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content-store')>();
  return {
    ...actual,
    listContentFiles: (dir: string) =>
      dir === 'case-studies'
        ? [...actual.listContentFiles(dir), 'example-draft.mdx']
        : actual.listContentFiles(dir),
    readContentFile: (relPath: string) =>
      relPath === 'case-studies/example-draft.mdx' ? DRAFT : actual.readContentFile(relPath),
  };
});

import {
  extractCaseStudyToc,
  getAllCaseStudies,
  getCaseStudy,
  getCaseStudyDraft,
  getListedCaseStudies,
} from '../case-studies';

afterEach(() => vi.unstubAllEnvs());

const listed = (studies: { slug: string }[], slug: string) =>
  studies.some((study) => study.slug === slug);

describe('case studies', () => {
  it('publishes the approved Pomerado study', () => {
    expect(getCaseStudy('pomerado')?.frontmatter.published).toBe(true);
    expect(listed(getAllCaseStudies(), 'pomerado')).toBe(true);
  });

  it('keeps unpublished studies out of public listings', () => {
    expect(listed(getAllCaseStudies(), 'example-draft')).toBe(false);
  });

  it('treats unpublished studies as missing in public slug lookups', () => {
    expect(getCaseStudy('example-draft')).toBeNull();
  });

  it('allows an explicit draft lookup on the local development server', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(getCaseStudy('example-draft')).toBeNull();
    expect(getCaseStudyDraft('example-draft')?.frontmatter.published).toBe(false);
  });

  it('does not expose drafts in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CASE_STUDY_DRAFTS', '');

    expect(getCaseStudyDraft('example-draft')).toBeNull();
    expect(listed(getListedCaseStudies(), 'example-draft')).toBe(false);
    expect(listed(getListedCaseStudies(), 'pomerado')).toBe(true);
  });

  it('lists and resolves drafts in PR preview builds', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CASE_STUDY_DRAFTS', '1');

    expect(getCaseStudy('example-draft')).toBeNull();
    expect(getCaseStudyDraft('example-draft')?.frontmatter.published).toBe(false);
    expect(listed(getListedCaseStudies(), 'example-draft')).toBe(true);
    expect(listed(getAllCaseStudies(), 'example-draft')).toBe(false);
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
