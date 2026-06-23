import { getDocMarkdown } from '../../../../lib/docs-markdown';
import { getAllDocSlugs } from '../../../../lib/docs-nav';

// Prerender every doc's `.md` mirror and serve it via ISR from the incremental
// cache on Cloudflare Workers (the handler reads docs from the filesystem, which
// only works at build time). dynamicParams=false 404s unknown paths instead of
// re-rendering them at request time. The next.config rewrite maps
// `/docs/<slug>.md` → `/docs/markdown/<slug>.md`, so params carry the `.md`.
export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  // The rewrite only matches single-segment `.md` paths, so skip nested slugs.
  return getAllDocSlugs()
    .filter((slug) => !slug.includes('/'))
    .map((slug) => ({ slug: [`${slug}.md`] }));
}

type RouteProps = {
  params: Promise<{ slug: string[] }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug: segments } = await params;
  const rawSlug = segments.at(-1) ?? '';
  const slug = rawSlug.replace(/\.md$/, '');

  if (segments.length !== 1 || !slug) {
    return new Response('Not found', { status: 404 });
  }

  const doc = getDocMarkdown(slug);

  if (!doc) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(doc.markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
