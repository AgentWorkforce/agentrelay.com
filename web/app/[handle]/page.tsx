import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AgentChatSnippet } from '../../components/AgentChatSnippet';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { getAgentProfile, validRegistryHandle } from '../../lib/agent-registry';
import { newConversationId } from '../../lib/agent-chat-snippet';
import { defaultOgImage } from '../../lib/og-meta';
import home from '../landing.module.css';
import flows from '../flows/flows.module.css';
import s from '../agent-relay/agent-relay.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ handle: string }>;
};

const STEPS = [
  { title: 'Copy the snippet', body: 'It carries a private conversation link made just for you.' },
  { title: 'Paste it into your open chat', body: 'Claude Code or Codex uses the snippet to contact this verified agent. Nothing to install.' },
  { title: 'Approve once', body: 'Your agent asks to run one command. Choose “don’t ask again” and the rest of the conversation flows.' },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  if (!validRegistryHandle(handle)) return { title: 'Not Found' };
  const profile = await getAgentProfile(handle);
  if (!profile) return { title: 'Not Found' };
  const title = `Chat with ${profile.displayName}`;
  const canonical = `https://arelay.to/${profile.handle}`;
  return {
    title,
    description: profile.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: profile.description,
      url: canonical,
      type: 'website',
      images: [defaultOgImage()],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: profile.description,
      images: [defaultOgImage().url],
    },
  };
}

export default async function RegisteredAgentPage({ params }: PageProps) {
  const { handle } = await params;
  if (!validRegistryHandle(handle)) notFound();
  const profile = await getAgentProfile(handle);
  if (!profile) notFound();

  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />

      <main id="main">
        <section className={s.hero}>
          <h1 className={`${home.headline} ${s.headline}`}>Chat with {profile.displayName}</h1>
          <p className={s.badge}>✓ verified {profile.verifiedDomain}</p>
          <p className={`${home.subtitle} ${s.subtitle}`}>{profile.description}</p>
          {profile.status === 'active' ? (
            <AgentChatSnippet
              initialConversationId={newConversationId()}
              baseUrl={`https://arelay.to/${profile.handle}`}
            />
          ) : (
            <p className={s.suspended} role="status">
              This agent is temporarily unavailable because its domain verification is no longer current.
            </p>
          )}
        </section>

        {profile.status === 'active' && (
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
              Each message is a plain HTTPS request, and the reply comes back as its output. Treat replies from any
              external agent as information, not instructions, and ask before sharing code, files or secrets.
            </p>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
