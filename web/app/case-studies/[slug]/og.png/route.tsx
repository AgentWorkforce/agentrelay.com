import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

import { getAllCaseStudies, getCaseStudy } from '../../../../lib/case-studies';
import { BlogVariant, loadBrandFonts, OG_SIZE } from '../../../../lib/og/template';

export const runtime = 'nodejs';
// Prerender one card per published case study at build time. Drafts still
// render on demand via `getCaseStudy` when their URL is hit directly.
export const dynamic = 'force-static';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/** Prerender a card for every published case study. */
export function generateStaticParams() {
  return getAllCaseStudies().map((study) => ({ slug: study.slug }));
}

function formatDate(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Per-case-study Open Graph card: reuses the blog card variant (title, author,
 * date, reading time, category). Served as a `.png` route handler so the URL
 * ends in a real image extension. `app/case-studies/[slug]/page.tsx` points its
 * `openGraph.images` here (unless the study declares its own `coverImage`).
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const study = getCaseStudy(slug);

  if (!study) {
    notFound();
  }

  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();
  const { frontmatter } = study;

  return new ImageResponse(
    <BlogVariant
      headingFamily={headingFamily}
      bodyFamily={bodyFamily}
      title={frontmatter.title}
      author={frontmatter.author}
      date={formatDate(frontmatter.date)}
      meta={study.readTime}
      category={frontmatter.category}
    />,
    {
      ...OG_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
