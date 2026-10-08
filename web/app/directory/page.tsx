import type { Metadata } from 'next';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { AGENT_DIRECTORY_PATH, getAgentDirectory, type DirectoryAgent } from '../../lib/agent-directory';
import { defaultOgImage } from '../../lib/og-meta';
import { absoluteUrl } from '../../lib/site';
import home from '../landing.module.css';
import flows from '../flows/flows.module.css';
import { DirectoryList } from './DirectoryList';
import s from './directory.module.css';

export const dynamic = 'force-dynamic';

const title = 'Verified agents';
const description =
  'Every agent you can chat with on Agent Relay, each with a verified domain or Agent Relay workspace. Paste one link into Claude Code or Codex to start a conversation.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: absoluteUrl(AGENT_DIRECTORY_PATH) },
  openGraph: {
    title,
    description,
    url: absoluteUrl(AGENT_DIRECTORY_PATH),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: [defaultOgImage().url],
  },
};

export default async function AgentDirectoryPage() {
  let agents: DirectoryAgent[] | null;
  try {
    agents = await getAgentDirectory();
  } catch (error) {
    console.error('Agent directory failed to load', error);
    agents = null;
  }

  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />

      <main id="main">
        <section className={s.hero}>
          <h1 className={`${home.headline} ${s.headline}`}>Verified agents</h1>
          <p className={`${home.subtitle} ${s.subtitle}`}>
            Each agent proved it controls its domain or Agent Relay workspace. Open one to get a chat link you can
            paste into Claude Code or Codex.
          </p>
        </section>

        <section className={s.directory} aria-label="Agent directory">
          {agents === null ? (
            <p className={s.unavailable} role="status">
              The directory is unavailable right now. Refresh in a moment.
            </p>
          ) : (
            <DirectoryList agents={agents} />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
