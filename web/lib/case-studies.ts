import matter from 'gray-matter';

import { listContentFiles, readContentFile } from './content-store';

const CASE_STUDY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface CaseStudyFrontmatter {
  title: string;
  description: string;
  date: string;
  updatedAt?: string;
  author: string;
  category: string;
  tags: string[];
  coverImage?: string;
  coverImageAlt?: string;
  /** The customer this case study is about. */
  company: string;
  /** Optional path to the customer's logo (e.g. `/logos/pomerado.svg`). */
  logo?: string;
  /**
   * Draft flag. When `false`, the entry is excluded from public lists and
   * public slug lookups. Defaults to published when omitted.
   */
  published?: boolean;
}

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface CaseStudy {
  slug: string;
  frontmatter: CaseStudyFrontmatter;
  content: string;
  readTime: string;
  toc: TocItem[];
}

function isValidCaseStudySlug(slug: string): boolean {
  return CASE_STUDY_SLUG_PATTERN.test(slug);
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function visibleHeadingText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[*_~]/g, '')
    .replace(/\\([\\`*_[\]{}()#+\-.!>])/g, '$1')
    .trim();
}

export function extractCaseStudyToc(content: string): TocItem[] {
  const toc: TocItem[] = [];
  let fence: { marker: '`' | '~'; length: number } | null = null;

  for (const line of content.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0] as '`' | '~';
      if (!fence) {
        fence = { marker, length: fenceMatch[1].length };
      } else if (marker === fence.marker && fenceMatch[1].length >= fence.length) {
        fence = null;
      }
      continue;
    }

    if (fence) continue;

    const headingMatch = line.match(/^ {0,3}(#{2,3})[ \t]+(.+?)[ \t]*#*[ \t]*$/);
    if (!headingMatch) continue;

    const text = visibleHeadingText(headingMatch[2]);
    toc.push({
      id: slugifyHeading(text),
      text,
      level: headingMatch[1].length as 2 | 3,
    });
  }

  return toc;
}

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function estimateReadTime(content: string): string {
  const words = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/[#>*_~-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

function normalizeFrontmatter(data: matter.GrayMatterFile<string>['data']): CaseStudyFrontmatter {
  return {
    title: (data.title as string) || '',
    description: (data.description as string) || '',
    date: (data.date as string) || '',
    updatedAt: (data.updatedAt as string) || undefined,
    author: (data.author as string) || '',
    category: (data.category as string) || '',
    tags: parseTags(data.tags),
    coverImage: (data.coverImage as string) || undefined,
    coverImageAlt: (data.coverImageAlt as string) || undefined,
    company: (data.company as string) || '',
    logo: (data.logo as string) || undefined,
    published: typeof data.published === 'boolean' ? (data.published as boolean) : true,
  };
}

function readCaseStudyFromFile(fileName: string): CaseStudy | null {
  const slug = fileName.replace(/\.mdx$/, '');
  return readCaseStudyBySlug(slug);
}

function readCaseStudyBySlug(slug: string): CaseStudy | null {
  if (!isValidCaseStudySlug(slug)) {
    return null;
  }

  const raw = readContentFile(`case-studies/${slug}.mdx`);
  if (raw === null) {
    return null;
  }
  const { data, content } = matter(raw);

  return {
    slug,
    frontmatter: normalizeFrontmatter(data),
    content,
    readTime: estimateReadTime(content),
    toc: extractCaseStudyToc(content),
  };
}

/**
 * Every published case study, newest first. Drafts (`published: false`) are
 * excluded from this list.
 */
export function getAllCaseStudies(): CaseStudy[] {
  const files = listContentFiles('case-studies').filter((file) => file.endsWith('.mdx'));

  return files
    .map((file) => readCaseStudyFromFile(file))
    .filter((study): study is CaseStudy => study !== null)
    .filter((study) => study.frontmatter.published !== false)
    .sort((a, b) => (a.frontmatter.date > b.frontmatter.date ? -1 : 1));
}

/**
 * Resolve a published case study by slug. Unpublished studies are treated as
 * missing so their page, metadata, and Open Graph routes all return not found.
 */
export function getCaseStudy(slug: string): CaseStudy | null {
  const study = readCaseStudyBySlug(slug);
  return study?.frontmatter.published === false ? null : study;
}

/**
 * Resolve a draft only on the local Next development server. Public lookups
 * remain publication-gated, and production/preview builds cannot use this
 * helper to expose unpublished content.
 */
export function getCaseStudyDraftForDevelopment(slug: string): CaseStudy | null {
  if (process.env.NODE_ENV !== 'development') return null;
  return readCaseStudyBySlug(slug);
}
