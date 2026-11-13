// Markdown rendering for the self-hosting guides (lib/selfhost-docs.ts).
//
// The rest of the docs compile MDX with evaluate(), which needs `new Function`.
// The guides are plain GFM Markdown with shell snippets full of braces and
// angle brackets, so they are rendered without any code evaluation instead:
// remark parses them, remark-rehype turns them into HTML nodes with raw HTML
// (including HTML comments) dropped, and hast-util-to-jsx-runtime builds React
// elements with the docs site's own code-block component. Pages render at
// build time (and ISR), so the guides ship in the build like any other doc.

import type { Element, ElementContent, Root as HastRoot } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root as MdastRoot } from 'mdast';
import type React from 'react';
import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';

import { CopyCodeButton } from '../components/docs/CopyCodeButton';
import styles from '../components/docs/docs.module.css';
import { slugify } from '../components/docs/mdx-components';
import type { TocItem } from './docs';

function textOf(node: ElementContent | Element): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

/** Only same-site paths, fragments, https and mailto links survive; anything else renders as text. */
function safeHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  // A backslash or control character can turn "/\\host" into a protocol-relative URL.
  if (/[\\\u0000-\u001f\u007f]/.test(href)) return null;
  if (href.startsWith('#') || (href.startsWith('/') && !href.startsWith('//'))) return href;
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'mailto:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function headingIds(tree: HastRoot): TocItem[] {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();
  const used = new Set<string>();
  const visit = (node: HastRoot | Element) => {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      if (child.tagName === 'h2' || child.tagName === 'h3') {
        const text = textOf(child).trim();
        const base = slugify(text) || 'section';
        // Count every id handed out, generated suffixes included, so a later
        // heading literally named "x-1" cannot collide with a deduped "x".
        let count = seen.get(base) ?? 0;
        let id = count === 0 ? base : `${base}-${count}`;
        while (used.has(id)) {
          count += 1;
          id = `${base}-${count}`;
        }
        seen.set(base, count + 1);
        used.add(id);
        child.properties = { ...child.properties, id };
        toc.push({ id, text, level: child.tagName === 'h2' ? 2 : 3 });
      } else {
        visit(child);
      }
    }
  };
  visit(tree);
  return toc;
}

function CodeBlock({ node }: { node?: Element }) {
  const code = node?.children.find((child): child is Element => child.type === 'element' && child.tagName === 'code');
  const raw = code ? textOf(code).replace(/\n$/, '') : '';
  const languageClass = (code?.properties?.className as string[] | undefined)?.find((name) => name.startsWith('language-'));
  return (
    <div className={styles.codeWrapper}>
      <CopyCodeButton code={raw} />
      <pre>
        <code className={languageClass} data-language={languageClass?.slice('language-'.length)}>
          {raw}
        </code>
      </pre>
    </div>
  );
}

function SafeLink({ href, children }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const target = safeHref(href);
  if (!target) return <>{children}</>;
  const external = /^https:/.test(target);
  return (
    <a href={target} {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}>
      {children}
    </a>
  );
}

const components = {
  pre: CodeBlock,
  a: SafeLink,
  // The guides carry no images; never let markdown load a remote one.
  img: () => null,
};

export function renderSelfhostMarkdown(markdown: string): { content: React.ReactNode; toc: TocItem[] } {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const mdast = processor.runSync(processor.parse(markdown)) as MdastRoot;
  // allowDangerousHtml stays off: raw HTML in a guide is dropped, not rendered.
  const hast = unified().use(remarkRehype).runSync(mdast) as HastRoot;
  const toc = headingIds(hast);
  const content = toJsxRuntime(hast, {
    Fragment,
    jsx,
    jsxs,
    components,
    passNode: true,
  } as Parameters<typeof toJsxRuntime>[1]);
  return { content, toc };
}
