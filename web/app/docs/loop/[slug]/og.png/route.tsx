import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';

import { DefaultVariant, loadBrandFonts, OG_SIZE } from '../../../../../lib/og/template';
import { getProductDoc, getProductDocSlugs } from '../../../../../lib/product-docs';
import { loopSection } from '../../../../../lib/product-docs-nav';

export const runtime = 'nodejs';
// Prerender one card per Relayloop doc at build time.
export const dynamic = 'force-static';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getProductDocSlugs(loopSection).map((slug) => ({ slug }));
}

/**
 * Per-doc Open Graph card for Relayloop: the default variant with a "Relayloop"
 * eyebrow plus the doc title and description — so these pages get a product card
 * instead of the site-wide Agent Relay default.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { slug } = await params;
  const doc = getProductDoc(loopSection.id, slug);

  if (!doc) {
    notFound();
  }

  const { fonts, headingFamily, bodyFamily } = await loadBrandFonts();

  return new ImageResponse(
    <DefaultVariant
      headingFamily={headingFamily}
      bodyFamily={bodyFamily}
      eyebrow={loopSection.label}
      title={doc.frontmatter.title}
      subtitle={doc.frontmatter.description}
    />,
    {
      ...OG_SIZE,
      ...(fonts.length > 0 ? { fonts } : {}),
    }
  );
}
