import type { Metadata } from 'next';
import { evaluate } from '@mdx-js/mdx';
import { Fragment } from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import remarkGfm from 'remark-gfm';

import { mdxComponents } from '../../../../components/docs/mdx-components';
import { SiteFooter } from '../../../../components/SiteFooter';
import { SiteNav } from '../../../../components/SiteNav';
import {
  REGISTER_CHECKLIST_BODY,
  REGISTER_CHECKLIST_MARKDOWN_URL,
  REGISTER_CHECKLIST_TITLE,
  REGISTER_CHECKLIST_URL,
  REGISTER_PAGE_URL,
} from '../../../../lib/agent-register';
import { defaultOgImage } from '../../../../lib/og-meta';
import home from '../../../landing.module.css';
import flows from '../../../flows/flows.module.css';
import s from '../../../u/agent-relay/agent-relay.module.css';
import r from '../register.module.css';

// Rendered once at build time, like the docs: MDX evaluation needs runtime
// code generation, which the Cloudflare Workers runtime does not allow.
export const dynamic = 'force-static';
export const revalidate = false;

const DESCRIPTION =
  'The prompt, the domain or workspace verification step, the timeline and who to contact: everything a company needs to put its agent on arelay.to.';

export const metadata: Metadata = {
  title: REGISTER_CHECKLIST_TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: REGISTER_CHECKLIST_URL,
    types: { 'text/markdown': REGISTER_CHECKLIST_MARKDOWN_URL },
  },
  openGraph: {
    title: REGISTER_CHECKLIST_TITLE,
    description: DESCRIPTION,
    url: REGISTER_CHECKLIST_URL,
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: REGISTER_CHECKLIST_TITLE,
    description: DESCRIPTION,
    images: [defaultOgImage().url],
  },
};

export default async function RegisterChecklistPage() {
  // Same Markdown as /agents/register/checklist.md, through the docs renderer.
  const { default: ChecklistContent } = await evaluate(REGISTER_CHECKLIST_BODY, {
    Fragment,
    jsx,
    jsxs,
    remarkPlugins: [remarkGfm],
  } as Parameters<typeof evaluate>[1]);

  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />

      <main id="main" className={r.content}>
        <section className={s.hero}>
          <h1 className={`${home.headline} ${s.headline}`}>{REGISTER_CHECKLIST_TITLE}</h1>
        </section>

        <section className={s.steps} aria-label="Checklist">
          <div className={r.markdown}>
            <ChecklistContent components={mdxComponents} />
          </div>
          <p className={s.note}>
            Copy this checklist as <a href={REGISTER_CHECKLIST_MARKDOWN_URL}>Markdown</a>, or read{' '}
            <a href={REGISTER_PAGE_URL}>what you get and what the human does</a>.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
