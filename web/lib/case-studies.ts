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
   * Draft flag. When `false`, the entry is excluded from the public list
   * (`getAllCaseStudies`) but still resolvable by slug (`getCaseStudy`) so a
   * draft URL renders in preview. Defaults to published when omitted.
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

function extractToc(content: string): TocItem[] {
  const toc: TocItem[] = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(content)) !== null) {
    const text = match[2].replace(/`([^`]+)`/g, '$1').trim();
    toc.push({
      id: slugifyHeading(text),
      text,
      level: match[1].length as 2 | 3,
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
  if (!isValidCaseStudySlug(slug)) {
    return null;
  }

  const raw = readContentFile(`case-studies/${fileName}`);
  if (raw === null) {
    return null;
  }
  const { data, content } = matter(raw);

  return {
    slug,
    frontmatter: normalizeFrontmatter(data),
    content,
    readTime: estimateReadTime(content),
    toc: extractToc(content),
  };
}

/**
 * Every published case study, newest first. Drafts (`published: false`) are
 * excluded from this list; use `getCaseStudy` to resolve a draft by slug.
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
 * Resolve a single case study by slug regardless of its `published` flag, so a
 * draft URL still renders at its address for preview/review.
 */
export function getCaseStudy(slug: string): CaseStudy | null {
  if (!isValidCaseStudySlug(slug)) {
    return null;
  }

  const raw = readContentFile(`case-studies/${slug}.mdx`);
  if (raw === null) return null;

  const { data, content } = matter(raw);

  return {
    slug,
    frontmatter: normalizeFrontmatter(data),
    content,
    readTime: estimateReadTime(content),
    toc: extractToc(content),
  };
}
