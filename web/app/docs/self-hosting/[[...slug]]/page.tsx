import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { DocsPageActions } from '../../../../components/docs/DocsPageActions';
import { Note } from '../../../../components/docs/Note';
import { TableOfContents } from '../../../../components/docs/TableOfContents';
import styles from '../../../../components/docs/docs.module.css';
import type { TocItem } from '../../../../lib/docs';
import {
  getSelfhostAgentIndex,
  getSelfhostGuide,
  getSelfhostGuides,
  getSelfhostStaticSlugs,
  parseSelfhostSlug,
  selfhostAgentIndexMarkdown,
  selfhostGuidePath,
  selfhostMarkdownFor,
  selfhostMarkdownPath,
  type SelfhostAudience,
  type SelfhostGuide,
  type SelfhostRoute,
} from '../../../../lib/selfhost-docs';
import { renderSelfhostMarkdown } from '../../../../lib/selfhost-markdown';
import { absoluteUrl, SITE_NAME } from '../../../../lib/site';
import s from './self-hosting.module.css';

// Public guides, prerendered at build time from content/self-hosting/*.md like
// the rest of the docs (the docs layout sets revalidate = false). Unknown
// paths 404 instead of rendering on demand.
export const dynamicParams = false;

export function generateStaticParams() {
  return getSelfhostStaticSlugs().map((slug) => ({ slug }));
}

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

type PageContent = {
  title: string;
  description: string;
  path: string;
  markdownPath: string;
  audience: SelfhostAudience;
  active: string;
  markdown: string;
  counterpart?: { href: string; label: string };
};

function contentFor(route: SelfhostRoute): PageContent | null {
  if (route.kind === 'agent-index') {
    const index = getSelfhostAgentIndex();
    if (!index) return null;
    return {
      title: index.title,
      description: index.description,
      path: selfhostGuidePath(undefined, 'agent'),
      markdownPath: selfhostMarkdownPath(undefined, 'agent'),
      audience: 'agent',
      active: 'agents',
      markdown: selfhostAgentIndexMarkdown(),
      counterpart: { href: selfhostGuidePath(), label: 'Human guides' },
    };
  }
  const guide = getSelfhostGuide(route.slug);
  if (!guide) return null;
  const agent = route.audience === 'agent';
  return {
    title: guide.title,
    description: guide.description,
    path: selfhostGuidePath(guide.slug, route.audience),
    markdownPath: selfhostMarkdownPath(guide.slug, route.audience),
    audience: route.audience,
    active: guide.slug,
    markdown: selfhostMarkdownFor(guide.source, route.audience),
    counterpart: agent
      ? { href: selfhostGuidePath(guide.slug), label: 'Human version of this guide' }
      : { href: selfhostGuidePath(guide.slug, 'agent'), label: 'Agent version of this guide' },
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = parseSelfhostSlug(slug);
  const page = route ? contentFor(route) : null;
  if (!page) return { title: 'Not Found' };
  const title = page.audience === 'agent' && page.active !== 'agents' ? `${page.title} (agent runbook)` : page.title;
  const url = absoluteUrl(page.path);
  return {
    title: `${title} · Self-hosting`,
    description: page.description,
    alternates: { canonical: url, types: { 'text/markdown': absoluteUrl(page.markdownPath) } },
    openGraph: { siteName: SITE_NAME, title, description: page.description, url, type: 'article' },
  };
}

export default async function SelfHostingPage({ params }: PageProps) {
  const { slug } = await params;
  const route = parseSelfhostSlug(slug);
  const page = route ? contentFor(route) : null;
  if (!page) notFound();

  const { content, toc } = renderSelfhostMarkdown(page.markdown);
  return (
    <Shell page={page} guides={getSelfhostGuides()} toc={toc}>
      {content}
      <hr />
      <p className={s.footerNote}>
        Stuck? See <Link href={selfhostGuidePath('troubleshooting', page.audience)}>troubleshooting</Link> or{' '}
        <Link href={selfhostGuidePath('support', page.audience)}>support</Link>.
      </p>
    </Shell>
  );
}

function GuideNav({ guides, audience, active }: { guides: SelfhostGuide[]; audience: SelfhostAudience; active: string }) {
  const groups: { name: string; guides: SelfhostGuide[] }[] = [];
  for (const guide of guides) {
    const last = groups.at(-1);
    if (last?.name === guide.group) last.guides.push(guide);
    else groups.push({ name: guide.group, guides: [guide] });
  }
  const link = (href: string, label: string, current: boolean) => (
    <Link
      href={href}
      className={`${s.runbookLink} ${current ? s.runbookLinkActive : ''}`}
      aria-current={current ? 'page' : undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className={s.runbookNav} aria-label={audience === 'agent' ? 'Self-hosting agent runbooks' : 'Self-hosting guides'}>
      <p className={styles.tocTitle}>{audience === 'agent' ? 'Self-hosting · agents' : 'Self-hosting'}</p>
      {audience === 'agent' && (
        <ul className={s.runbookList}>
          <li>{link(selfhostGuidePath(undefined, 'agent'), 'Rules for agents', active === 'agents')}</li>
        </ul>
      )}
      {groups.map((group) => (
        <div key={group.name}>
          <p className={s.groupTitle}>{group.name}</p>
          <ul className={s.runbookList}>
            {group.guides.map((guide) => (
              <li key={guide.slug}>
                {link(
                  selfhostGuidePath(guide.slug, audience),
                  guide.slug === 'overview' ? 'Overview' : guide.title,
                  active === guide.slug
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {audience === 'human' && (
        <ul className={s.runbookList}>
          <li>{link(selfhostGuidePath(undefined, 'agent'), 'For coding agents', false)}</li>
        </ul>
      )}
    </nav>
  );
}

function Shell({
  page,
  guides,
  toc,
  children,
}: {
  page: PageContent;
  guides: SelfhostGuide[];
  toc: TocItem[];
  children: ReactNode;
}) {
  const agent = page.audience === 'agent';
  return (
    <div className={styles.articleWrapper}>
      <article className={styles.article}>
        <p className={s.eyebrow}>
          <Link href={selfhostGuidePath(undefined, page.audience)}>Self-hosting</Link>
          {agent && <span className={s.badge}>Agent runbook</span>}
        </p>
        <div className={styles.articleHeader}>
          <div className={styles.articleHeading}>
            <h1>{page.title}</h1>
          </div>
          <DocsPageActions
            title={page.title}
            pageUrl={absoluteUrl(page.path)}
            markdownPath={page.markdownPath}
            markdownUrl={absoluteUrl(page.markdownPath)}
          />
        </div>
        {page.description && <p className={styles.articleDescription}>{page.description}</p>}
        {page.counterpart && (
          <p className={s.counterpart}>
            <Link href={page.counterpart.href}>{page.counterpart.label}</Link>
            {' · '}
            <a href={page.markdownPath}>Markdown</a>
          </p>
        )}
        {agent && (
          <Note>
            Written for a coding agent working for you. Lines marked <strong>Agent:</strong> are its checks and stop
            points. Everything else matches the human guide.
          </Note>
        )}
        <div className={s.mobileNav}>
          <GuideNav guides={guides} audience={page.audience} active={page.active} />
        </div>
        <div className={styles.articleBody}>{children}</div>
      </article>
      <aside className={styles.tocSidebar}>
        <div className={s.sideNav}>
          <GuideNav guides={guides} audience={page.audience} active={page.active} />
        </div>
        {toc.length > 0 && <TableOfContents items={toc} showLanguage={false} />}
      </aside>
    </div>
  );
}
