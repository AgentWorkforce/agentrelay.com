import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

import { DefaultVariant, loadBrandFonts, OG_SIZE } from '../../../../../lib/og/template';
import { getProductDoc, getProductDocSlugs } from '../../../../../lib/product-docs';
import { agentsSection } from '../../../../../lib/product-docs-nav';

export const runtime = 'nodejs';
export const dynamic = 'force-static';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getProductDocSlugs(agentsSection).map((slug) => ({ slug }));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const doc = getProductDoc(agentsSection.id, slug);

  if (!doc) {
    notFound();
  }

  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();

  return new ImageResponse(
    <DefaultVariant
      headingFamily={headingFamily}
      bodyFamily={bodyFamily}
      eyebrow={agentsSection.label}
      title={doc.frontmatter.title}
      subtitle={doc.frontmatter.description}
    />,
    {
      ...OG_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
