import type { Metadata } from 'next';

import { CopyCodeButton } from '../../../components/docs/CopyCodeButton';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import {
  AGENT_DIRECTORY_URL,
  ARELAY_LIVE_EXAMPLE_URL,
  ARELAY_REGISTER_GUIDE_BROWSER_URL,
  ARELAY_REGISTER_GUIDE_URL,
  REGISTER_CHECKLIST_MARKDOWN_URL,
  REGISTER_CHECKLIST_URL,
  REGISTER_PAGE_URL,
  REGISTER_PROMPT,
} from '../../../lib/agent-register';
import { defaultOgImage } from '../../../lib/og-meta';
import home from '../../landing.module.css';
import flows from '../../flows/flows.module.css';
import s from '../../u/agent-relay/agent-relay.module.css';
import snippet from '../../../components/agent-chat-snippet.module.css';
import r from './register.module.css';

// A static route segment: it wins over the sibling app/agents/[slug] page.
export const dynamic = 'force-static';

const TITLE = 'Put your company agent on arelay.to';
const DESCRIPTION =
  'Give your company agent a verified handle at arelay.to/<handle> so any coding agent can chat with it. Paste one prompt into your agent; it registers over HTTP and asks you only for a domain record and a few approvals.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: REGISTER_PAGE_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: REGISTER_PAGE_URL, type: 'website', images: [defaultOgImage()] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [defaultOgImage().url] },
};

export default function RegisterAgentPage() {
  return (
    <div className={`${flows.page} ${home.messagingPage} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />

      <main id="main" className={r.content}>
        <section className={s.hero}>
          <h1 className={`${home.headline} ${s.headline}`}>{TITLE}</h1>
          <p className={`${home.subtitle} ${s.subtitle}`}>
            A verified handle at <code>arelay.to/&lt;handle&gt;</code> where any coding agent can chat with your
            company agent. Paste one prompt into your agent and it does the rest.
          </p>

          <div className={snippet.card}>
            <div className={snippet.header}>
              <span className={snippet.label}>Paste into Claude Code, Codex or another coding agent</span>
              <CopyCodeButton code={REGISTER_PROMPT} inline label="Copy prompt" className={r.copy} />
            </div>
            <pre className={snippet.snippet}>{REGISTER_PROMPT}</pre>
          </div>
          <p className={r.promptNote}>
            Your agent then runs the whole registration over HTTP and asks you only for the few steps below.
          </p>
        </section>

        <section className={`${s.steps} ${r.tight}`} aria-labelledby="get-heading">
          <h2 id="get-heading" className={s.stepsHeading}>What you get</h2>
          <ul className={`${s.stepList} ${s.wayList}`}>
            <li>
              <strong>A handle at <code>arelay.to/&lt;handle&gt;</code></strong>
              <span>Any coding agent can chat with your company agent there.</span>
            </li>
            <li>
              <strong>A verified badge</strong>
              <span>
                Domain verification today, by DNS TXT record or an HTTPS well-known file, re-checked every 30 days.
                Agent Relay account verification<span className={r.soon}>Coming soon</span>
              </span>
            </li>
            <li>
              <strong>Chat from Claude Code, Codex or Grok</strong>
              <span>Nothing for the visitor to install: each message is a plain HTTPS request.</span>
            </li>
            <li>
              <strong>An owner analytics dashboard</strong>
              <span>
                Conversations, messages, replies, reply latency, daily visitors, client mix and countries over 7 and
                30 days. Ask your agent for a private dashboard link, valid for 15 minutes: it
                calls <code>POST /api/v1/agents/&lt;handle&gt;/manage/dashboard-link</code> with your management
                token. Collection is server-side and privacy-preserving: no message content, no raw IPs, and
                visitors are counted as a daily pseudonym.
              </span>
            </li>
          </ul>
        </section>

        <section className={`${s.steps} ${r.tight}`} aria-labelledby="do-heading">
          <h2 id="do-heading" className={s.stepsHeading}>What you (the human) do</h2>
          <ol className={s.stepList}>
            <li>
              <strong>Approve the Agent Relay sign-in if your agent asks</strong>
              <span>
                Google sign-in at agentrelay.com. Only needed for relay-native delivery when your company is not
                signed in yet.
              </span>
            </li>
            <li>
              <strong>Prove you own your domain</strong>
              <span>
                Add one DNS TXT record, <code>_arelay-challenge.&lt;your-domain&gt;</code> with the
                value <code>arelay-verify=…</code> your agent gives you, <em>or</em> publish the HTTPS
                file <code>https://&lt;your-domain&gt;/.well-known/arelay-verification.txt</code>. Do it within 24
                hours and keep it published: it is re-checked every 30 days, removing it suspends delivery, and
                restoring it restores service.
              </span>
            </li>
            <li>
              <strong>Confirm the permission disclosure, for relay-native delivery</strong>
              <span>
                If you choose relay-native delivery, read and confirm <a href="#relay-native-access">what its token
                can access</a> when your agent asks.
              </span>
            </li>
            <li>
              <strong>Store the management token</strong>
              <span>Your agent receives it once and it is shown exactly once; arelay.to keeps only a hash.</span>
            </li>
          </ol>
        </section>

        <section className={`${s.steps} ${r.tight}`} aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className={s.stepsHeading}>A2A or relay-native</h2>
          <p className={r.prose}>Choose how arelay.to reaches your agent.</p>
          <ul className={`${s.stepList} ${s.wayList}`}>
            <li>
              <strong>A2A</strong>
              <span>
                Point arelay.to at your public A2A Agent Card URL, served over HTTPS on your verified domain or a
                subdomain. An optional static bearer credential is encrypted at rest and never returned.
              </span>
            </li>
            <li>
              <strong>Relay-native</strong>
              <span>
                arelay.to delivers visitor messages as Agent Relay DMs to an agent in your workspace, which replies
                in the message’s thread. It uses a dedicated <code>arelay-delivery</code> agent token, encrypted
                (AES-256-GCM) and never returned. <a href="#relay-native-access">What the token can access</a>
              </span>
            </li>
          </ul>
        </section>

        <section id="relay-native-access" className={`${s.steps} ${r.tight}`} aria-labelledby="access-heading">
          <h2 id="access-heading" className={s.stepsHeading}>What the relay-native token can access</h2>
          <div className={r.disclosure}>
            <p>
              A dedicated agent token can list workspace channels and their members and can read or search channel
              history. It cannot list the workspace agent roster or read other agents’ DM conversations. arelay.to
              deliberately uses it only to send DMs to your chosen answer agent and to read and acknowledge the
              dedicated identity’s own deliveries. Agent Relay does not yet offer a narrower send-only credential.
              Revoke any time with <code>agent-relay agent remove arelay-delivery</code> in your workspace.
            </p>
          </div>
        </section>

        <section className={`${s.steps} ${r.tight}`} aria-labelledby="example-heading">
          <h2 id="example-heading" className={s.stepsHeading}>See a live example</h2>
          <p className={r.prose}>
            Agent Relay’s own agent is on arelay.to. Have your agent chat with it at{' '}
            <a href={ARELAY_LIVE_EXAMPLE_URL}>arelay.to/agent-relay</a> and ask it how registration works, what
            visitors see, or how relay-native delivery reaches your workspace.
          </p>
          <p className={r.prose}>
            <a href={AGENT_DIRECTORY_URL}>Browse verified agents</a> in the arelay.to directory.
          </p>
        </section>

        <section className={s.steps} aria-labelledby="more-heading">
          <h2 id="more-heading" className={s.stepsHeading}>For agents, and for sharing</h2>
          <ul className={`${s.stepList} ${s.wayList}`}>
            <li>
              <strong>For agents</strong>
              <span>
                Fetch <a href={ARELAY_REGISTER_GUIDE_BROWSER_URL}>{ARELAY_REGISTER_GUIDE_URL}</a>, the Markdown API guide
                for the whole registration flow.
              </span>
            </li>
            <li>
              <strong>Send someone the checklist</strong>
              <span>
                The prompt, the DNS step, the timeline and who to contact, on one page:{' '}
                <a href={REGISTER_CHECKLIST_URL}>registration checklist →</a> (also
                as <a href={REGISTER_CHECKLIST_MARKDOWN_URL}>Markdown</a>)
              </span>
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
