import type { Metadata } from 'next';

import { ProductDocPage } from '../../../../components/docs/ProductDocPage';
import { ogImage } from '../../../../lib/og-meta';
import {
  fileSection,
  getProductDoc,
  getProductDocMarkdownUrl,
  getProductDocSlugs,
} from '../../../../lib/product-docs';
import { absoluteUrl } from '../../../../lib/site';

const SECTION_ID = fileSection.id;

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getProductDocSlugs(fileSection).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getProductDoc(SECTION_ID, slug);

  if (!doc) {
    return { title: 'Not Found' };
  }

  const ogPath = `/docs/${SECTION_ID}/${slug}/og.png`;

  return {
    title: `${doc.frontmatter.title} — Relayfile`,
    description: doc.frontmatter.description,
    alternates: {
      canonical: absoluteUrl(`/docs/${SECTION_ID}/${slug}`),
      types: { 'text/markdown': getProductDocMarkdownUrl(SECTION_ID, slug) },
    },
    openGraph: {
      title: `${doc.frontmatter.title} — Relayfile`,
      description: doc.frontmatter.description,
      url: absoluteUrl(`/docs/${SECTION_ID}/${slug}`),
      type: 'article',
      images: [ogImage(ogPath, `${doc.frontmatter.title} — Relayfile docs`)],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${doc.frontmatter.title} — Relayfile`,
      description: doc.frontmatter.description,
      images: [absoluteUrl(ogPath)],
    },
  };
}

export default async function RelayfileDocPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProductDocPage sectionId={SECTION_ID} slug={slug} />;
}
