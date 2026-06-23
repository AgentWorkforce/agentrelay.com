import { notFound } from 'next/navigation';
import { evaluate } from '@mdx-js/mdx';
import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';

import { getProductDoc, getProductDocMarkdownUrl } from '../../lib/product-docs';
import { absoluteUrl } from '../../lib/site';
import { DocsPageActions } from './DocsPageActions';
import { mdxComponents } from './mdx-components';
import { TableOfContents } from './TableOfContents';
import styles from './docs.module.css';

export async function ProductDocPage({ sectionId, slug }: { sectionId: string; slug: string }) {
  const doc = getProductDoc(sectionId, slug);

  if (!doc) {
    notFound();
  }

  const { default: MDXContent } = await evaluate(doc.content, {
    Fragment,
    jsx,
    jsxs,
    remarkPlugins: [remarkGfm],
  } as Parameters<typeof evaluate>[1]);

  const pageUrl = absoluteUrl(`/docs/${sectionId}/${slug}`);
  const markdownPath = `/docs/${sectionId}/markdown/${slug}.md`;
  const markdownUrl = getProductDocMarkdownUrl(sectionId, slug);

  return (
    <div className={styles.articleWrapper}>
      <article className={styles.article}>
        <div className={styles.articleHeader}>
          <div className={styles.articleHeading}>
            <h1>{doc.frontmatter.title}</h1>
          </div>
          <DocsPageActions
            title={doc.frontmatter.title}
            pageUrl={pageUrl}
            markdownPath={markdownPath}
            markdownUrl={markdownUrl}
          />
        </div>
        {doc.frontmatter.description && (
          <p className={styles.articleDescription}>{doc.frontmatter.description}</p>
        )}
        <div className={styles.articleBody}>
          <MDXContent components={mdxComponents} />
        </div>
      </article>
      <aside className={styles.tocSidebar}>
        <TableOfContents items={doc.toc} />
      </aside>
    </div>
  );
}
