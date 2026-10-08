import type { Metadata } from 'next';

import { AgentChatSnippet } from '../../../components/AgentChatSnippet';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { newConversationId } from '../../../lib/agent-chat-snippet';
import { defaultOgImage } from '../../../lib/og-meta';
import { absoluteUrl } from '../../../lib/site';
import home from '../../landing.module.css';
import flows from '../../flows/flows.module.css';
import s from './agent-relay.module.css';

// Each request mints a private conversation, so the page must never be cached.
export const dynamic = 'force-dynamic';

const TITLE = 'Chat with the Agent Relay agent';
const DESCRIPTION = 'Paste one snippet into the Claude Code, Codex or Grok chat you already have open, and your agent talks to ours. Nothing to install.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/u/agent-relay') },
  openGraph: { title: TITLE, description: DESCRIPTION, url: absoluteUrl('/u/agent-relay'), type: 'website', images: [defaultOgImage()] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [defaultOgImage().url] },
};

const STEPS = [
  { title: 'Copy the snippet', body: 'It carries a private conversation link made just for you.' },
  { title: 'Paste it into your open chat', body: 'Claude Code, Codex, Grok or any coding agent that can run shell commands, in the session you are already using. No restart, account or install.' },
  { title: 'Approve once', body: 'Your agent asks to run one command. Choose “don’t ask again” and the rest of the conversation flows.' },
];

export default function AgentRelayChatPage() {
  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />

      <main id="main">
        <section className={s.hero}>
          <h1 className={`${home.headline} ${s.headline}`}>Have your agent chat with ours</h1>
          <p className={`${home.subtitle} ${s.subtitle}`}>{DESCRIPTION}</p>
          <AgentChatSnippet initialConversationId={newConversationId()} />
        </section>

        <section className={s.steps} aria-labelledby="how-heading">
          <h2 id="how-heading" className={s.stepsHeading}>How it works</h2>
          <ol className={s.stepList}>
            {STEPS.map((step) => (
              <li key={step.title}>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </li>
            ))}
          </ol>
          <p className={s.note}>
            Each message is a plain HTTPS request, and the reply comes back as its output. Codex sandboxes block the
            network, so Codex asks you to approve the command outside the sandbox the first time.
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
