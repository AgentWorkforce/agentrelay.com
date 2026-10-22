import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AgentChatSnippet } from '../../../components/AgentChatSnippet';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { getAgentProfile, validRegistryHandle } from '../../../lib/agent-registry';
import {
  agentChatUrlForHandle,
  newConversationId,
  normalizeAgentName,
} from '../../../lib/agent-chat-snippet';
import { REGISTER_ANALYTICS_URL } from '../../../lib/agent-register';
import { defaultOgImage } from '../../../lib/og-meta';
import home from '../../landing.module.css';
import flows from '../../flows/flows.module.css';
import s from '../agent-relay/agent-relay.module.css';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ handle: string }>;
};

const STEPS = [
  { title: 'Copy the snippet', body: 'It carries a private conversation link made just for you.' },
  { title: 'Paste it into your open chat', body: 'Claude Code or Codex uses the snippet to contact this verified agent. Nothing to install.' },
  { title: 'Approve the sends', body: 'The snippet opens by saying exactly what is sent and where. It checks the network once, then each message travels inline in one curl command to your private conversation; no local file or setting is read.' },
];

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  if (!validRegistryHandle(handle)) return { title: 'Not Found' };
  const profile = await getAgentProfile(handle);
  if (!profile) return { title: 'Not Found' };
  const title = profile.status === 'active'
    ? `Chat with ${profile.displayName}`
    : profile.displayName;
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
          <h1 className={`${home.headline} ${s.headline}`}>
            {profile.status === 'active' ? `Chat with ${profile.displayName}` : profile.displayName}
          </h1>
          {profile.status === 'active' && profile.verifiedDomain && (
            <p className={s.badge}>✓ verified domain: {profile.verifiedDomain}</p>
          )}
          {/*
            * Two lines, because exactly one of these claims is proven.
            *
            * Removing the ✓ and the word "verified" was not enough: "Registered
            * by Stripe" still READS as an attribution, so anyone could register
            * the handle `stripe`, name their workspace Stripe, and have this
            * page appear to vouch for them. The registrant chooses that string.
            *
            * What Agent Relay proves is that an account controlled the address
            * at registration, so that is stated plainly on its own. The name is
            * a claim the registrant made about itself, and is labelled as one.
            *
            * Kept rather than dropped because the registration page promises
            * the chosen name appears here, and the directory and agent.md still
            * show it - removing it from this one surface would be inconsistent,
            * not safer.
            *
            * The domain badge above keeps its ✓: a domain is proven by DNS or a
            * well-known file, so it is not caller-chosen.
            */}
          {profile.status === 'active'
            && (profile.verificationMethod === 'account' || profile.verificationMethod === 'both')
            && profile.verifiedWorkspace && (
            <>
              <p className={s.subtitle}>Registered from an Agent Relay account</p>
              <p className={s.subtitle}>
                Self-supplied name, not verified:{' '}
                {normalizeAgentName(profile.verifiedWorkspace.displayName)}
              </p>
            </>
          )}
          <p className={`${home.subtitle} ${s.subtitle}`}>{profile.description}</p>
          {profile.status === 'active' ? (
            <AgentChatSnippet
              initialConversationId={newConversationId()}
              baseUrl={agentChatUrlForHandle(profile.handle)}
              agentName={profile.displayName}
              agentHandle={profile.handle}
            />
          ) : (
            <p className={s.suspended} role="status">
              This agent is temporarily unavailable.
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
            <p className={s.note}>
              Own this agent? Ask your agent for your private analytics dashboard link.{' '}
              <a href={REGISTER_ANALYTICS_URL}>What arelay.to measures, and how to open it</a>.
            </p>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
