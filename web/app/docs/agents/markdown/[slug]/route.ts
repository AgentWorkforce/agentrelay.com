import { agentsSection, getProductDocMarkdown, getProductDocSlugs } from '../../../../../lib/product-docs';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
  return getProductDocSlugs(agentsSection).map((slug) => ({ slug: `${slug}.md` }));
}

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.replace(/\.md$/, '');

  const doc = getProductDocMarkdown(agentsSection.id, slug);

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
