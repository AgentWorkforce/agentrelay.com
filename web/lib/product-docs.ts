import matter from 'gray-matter';

import { readContentFile } from './content-store';
import type { DocContent, SearchEntry } from './docs';
import { getDoc } from './docs';
import { renderMarkdownBody } from './docs-markdown';
import type { ProductDocSection } from './product-docs-nav';
import { getProductDocSlugs } from './product-docs-nav';
import { absoluteUrl } from './site';

// Re-export the pure nav surface so server code can import everything from one
// place. Client components must import from `./product-docs-nav` directly to
// avoid pulling the server-only loaders below into the browser bundle.
export type { NavItem, NavGroup, ProductDocSection } from './product-docs-nav';
export {
  agentsSection,
  factorySection,
  fileSection,
  loopSection,
  productSections,
  getProductSection,
  getProductSectionForPath,
  getProductDocSlugs,
  productBasePath,
} from './product-docs-nav';

/** Load a product doc; content lives at `content/docs/<sectionId>/<slug>.mdx`. */
export function getProductDoc(sectionId: string, slug: string): DocContent | null {
  return getDoc(`${sectionId}/${slug}`);
}

export function getProductDocMarkdownUrl(sectionId: string, slug: string): string {
  return absoluteUrl(`/docs/${sectionId}/markdown/${slug}.md`);
}

/** Markdown mirror of a product doc, for the `.md` endpoints and copy actions. */
export function getProductDocMarkdown(
  sectionId: string,
  slug: string
): { title: string; description: string; markdown: string } | null {
  const raw = readContentFile(`docs/${sectionId}/${slug}.mdx`);
  if (raw === null) return null;

  const { data, content } = matter(raw);
  const title = (data.title as string) || slug;
  const description = (data.description as string) || '';
  const canonicalUrl = absoluteUrl(`/docs/${sectionId}/${slug}`);
  const markdownUrl = getProductDocMarkdownUrl(sectionId, slug);

  const header = [
    `# ${title}`,
    description ? `\n${description}` : '',
    `\nRendered page: ${canonicalUrl}`,
    `Markdown endpoint: ${markdownUrl}`,
    '\n---\n',
  ]
    .filter(Boolean)
    .join('\n');

  return { title, description, markdown: `${header}\n${renderMarkdownBody(content)}\n` };
}

/** Per-section search index, scoped to that product's pages. */
export function getProductSearchIndex(section: ProductDocSection): SearchEntry[] {
  return getProductDocSlugs(section).flatMap((slug) => {
    const raw = readContentFile(`docs/${section.id}/${slug}.mdx`);
    if (raw === null) return [];

    const { data, content } = matter(raw);
    const headings: string[] = [];
    const hRegex = /^#{2,3}\s+(.+)$/gm;
    let m;
    while ((m = hRegex.exec(content)) !== null) {
      headings.push(m[1].replace(/`([^`]+)`/g, '$1').trim());
    }

    const body = content
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('<') && !line.trim().startsWith('```'))
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 500);

    return [
      {
        slug,
        title: (data.title as string) || slug,
        description: (data.description as string) || '',
        headings,
        body,
      },
    ];
  });
}
