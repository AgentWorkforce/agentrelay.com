// Request-time markdown rendering for the gated self-hosting runbooks.
//
// The public docs compile MDX at build time; MDX's evaluate() needs
// `new Function`, which the Cloudflare Workers runtime forbids, and the
// runbooks must never be in the build anyway. So this renders plain GFM
// markdown with no code evaluation: remark parses it, remark-rehype turns it
// into HTML nodes with raw HTML dropped, and hast-util-to-jsx-runtime builds
// React elements with the docs site's own heading and code-block components.

import type { Element, ElementContent, Root as HastRoot } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { InlineCode, Link, Parent, Root as MdastRoot, RootContent } from 'mdast';
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
import { selfhostDocPath } from './selfhost-docs';

const RUNBOOK_REFERENCE = /^selfhost:([a-z0-9][a-z0-9-]{0,63})$/;

function textOf(node: ElementContent | Element): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(textOf).join('');
  return '';
}

/**
 * The runbooks cite each other as `selfhost:<name>` (the form the support
 * agent uses). For a reader that becomes a link to the runbook's page.
 */
function linkRunbookReferences(tree: MdastRoot) {
  const visit = (parent: Parent) => {
    parent.children = parent.children.map((child): RootContent => {
      if (child.type === 'link') return child;
      if (child.type === 'inlineCode') {
        const match = RUNBOOK_REFERENCE.exec((child as InlineCode).value);
        if (match) {
          const link: Link = { type: 'link', url: selfhostDocPath(match[1]), children: [child] };
          return link;
        }
      }
      if ('children' in child) visit(child as Parent);
      return child;
    });
  };
  visit(tree);
}

/** Only same-site paths, fragments, https and mailto links survive; anything else renders as text. */
function safeHref(href: unknown): string | null {
  if (typeof href !== 'string') return null;
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
  const visit = (node: HastRoot | Element) => {
    for (const child of node.children) {
      if (child.type !== 'element') continue;
      if (child.tagName === 'h2' || child.tagName === 'h3') {
        const text = textOf(child).trim();
        const base = slugify(text) || 'section';
        const count = seen.get(base) ?? 0;
        seen.set(base, count + 1);
        const id = count === 0 ? base : `${base}-${count}`;
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
  // Runbooks carry no images; never let markdown load a remote one.
  img: () => null,
};

export function renderSelfhostMarkdown(markdown: string): { content: React.ReactNode; toc: TocItem[] } {
  const processor = unified().use(remarkParse).use(remarkGfm);
  const mdast = processor.runSync(processor.parse(markdown)) as MdastRoot;
  linkRunbookReferences(mdast);
  // allowDangerousHtml stays off: raw HTML in a runbook is dropped, not rendered.
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
