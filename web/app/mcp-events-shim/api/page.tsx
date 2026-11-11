import type { Metadata } from 'next';
import Link from 'next/link';

import { CodeBlock } from '../../../components/events-shim/CodeBlock';
import s from '../../../components/events-shim/events-shim.module.css';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import { SiteNavActions } from '../../../components/SiteNavActions';
import { defaultOgImage } from '../../../lib/og-meta';
import { absoluteUrl, SITE_EMAIL, SITE_NAME } from '../../../lib/site';

const TITLE = 'Wake agents from your own MCP';
const DESCRIPTION =
  'Your MCP keeps the data. Send Agent Relay a one-line nudge and it lands in the agent’s session, waking it even when idle. Hosted or self-hosted, priced per message.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/mcp-events-shim/api') },
  openGraph: {
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/mcp-events-shim/api'),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [defaultOgImage().url] },
};

const BASE = 'https://agentrelay.com/cloud/api/v1/events-shim';

const CREATE = `curl -X POST ${BASE}/shims
# → { "mcp_url": ".../t/esm_…/mcp",
#     "webhook_urls": { "bearer": ".../h/esh_…/bearer", … },
#     "manage_token": "esk_…" }`;

const BEARER = `curl -X PUT ${BASE}/shims/current/secrets/bearer \\
  -H "Authorization: Bearer $MANAGE_TOKEN" \\
  -H 'Content-Type: application/json' -d '{}'
# → { "secret": "esb_…" }   shown once; keep it with the user's record`;

const NUDGE = `# WEBHOOK_URL is the inbox's /bearer URL
curl -X POST "$WEBHOOK_URL" \\
  -H "Authorization: Bearer $NUDGE_SECRET" \\
  -H 'Content-Type: text/plain' \\
  -H 'Idempotency-Key: task_42' \\
  --data 'New task t_42 is waiting. Read it with get_task on the acme MCP, then ack it.'
# → 202 { "ok": true, "seq": 7, "wake": "forwarding" }`;

const STATUS = `curl ${BASE}/shims/current -H "Authorization: Bearer $MANAGE_TOKEN"
# → { "agent": { "connected": true, "wake": "linked" },
#     "events": [{ "seq": 7, "delivery": "woken" }, …] }`;

const INSTALL = `claude mcp add --transport http webhooks "$MCP_URL"
# then: "Watch for webhooks and tell me when one arrives."`;

const steps = [
  {
    n: '1',
    title: 'Create an inbox per agent',
    body: 'One API call gives you an MCP URL for the user and a private webhook URL for your backend.',
  },
  {
    n: '2',
    title: 'The agent connects once',
    body: 'The user adds the MCP URL next to yours. Under Agent Relay, the agent links its own session, so later nudges arrive in that session.',
  },
  {
    n: '3',
    title: 'Your backend sends the nudge',
    body: 'POST the exact words the agent should see. It wakes, calls your MCP for the real content, and acks it there.',
  },
];

export default function McpEventsShimApiPage() {
  return (
    <>
      <SiteNav hideLinks singleAction actions={<SiteNavActions />} />
      <main className={s.main}>
        <section className={s.hero}>
          <p className={s.eyebrow}>Agent Relay · Wake API</p>
          <h1 className={s.headline}>
            Want to use our API for your <em>own</em> MCP?
          </h1>
          <p className={s.lead}>
            You run the MCP and the mailbox. We deliver the nudge: the exact string you send lands in the agent&apos;s session
            and <strong>wakes it, even when idle</strong>. No polling, no burned tokens, and your data never passes through us.
          </p>
          <div className={s.cta}>
            <a className={s.ctaPrimary} href={`mailto:${SITE_EMAIL}?subject=Wake%20API`}>
              Talk to us about volume
            </a>
            <Link className={s.ctaLink} href="/mcp-events-shim">
              Try it in your browser
            </Link>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.numeral}>i</span> How it works
          </h2>
          <div className={s.steps}>
            {steps.map((step) => (
              <article key={step.n} className={s.step}>
                <span className={s.numeral}>{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
          <div className={s.prose}>
            <p style={{ marginTop: '1rem' }}>
              Think of it as a SYN, not the payload. The nudge says <em>there is something for you</em> and names the id. The
              agent fetches it, takes the lease, and confirms through <strong>your</strong> MCP, so delivery is acknowledged
              where your data lives. All Agent Relay ever stores is the nudge text.
            </p>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.numeral}>ii</span> The API
          </h2>
          <p className={s.stepLabel}>Create an inbox (one per user or agent)</p>
          <CodeBlock code={CREATE} />
          <p className={s.stepLabel}>Give your backend a sender key</p>
          <CodeBlock code={BEARER} />
          <p className={s.stepLabel}>Hand the user one line</p>
          <CodeBlock code={INSTALL} />
          <p className={s.stepLabel}>Send a nudge</p>
          <CodeBlock code={NUDGE} />
          <p className={s.stepLabel}>Check delivery</p>
          <CodeBlock code={STATUS} />
          <div className={s.prose}>
            <p style={{ marginTop: '1rem' }}>
              <strong>Verbatim on authenticated URLs.</strong> A <code>text/plain</code> post to the bearer URL (or a GitHub,
              Stripe or Linear signed URL) is delivered as exactly that text, trimmed and cut at 6,000 characters, so you
              control the prompt. On signed provider URLs the body must be plain text, not a JSON event, since the signature
              does not cover <code>Content-Type</code>. Posts to the open URL are always wrapped and marked as untrusted,
              because anyone holding that URL can send them.
            </p>
            <p>
              <strong>Once per key.</strong> Retries with the same <code>Idempotency-Key</code> wake the agent once.
            </p>
            <p>
              <strong>Delivery states.</strong> Each nudge is <code>woken</code> (injected into the session), <code>read</code>{' '}
              (picked up through the MCP) or <code>waiting</code>. If a session isn&apos;t running Agent Relay, the agent
              falls back to a background <code>wait_for_webhook</code> call and still gets it within seconds.
            </p>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.numeral}>iii</span> Where it runs
          </h2>
          <div className={s.prose}>
            <p>
              <strong>Agent Relay Cloud.</strong> Use the endpoints above. You send a pointer, not customer data, which keeps
              the security review short.
            </p>
            <p>
              <strong>Self-hosted.</strong> The same API ships in the open-source control plane. Turn on the{' '}
              <code>events_shim</code> feature and run it in your own AWS, GCP or Kubernetes with our Helm charts. The wake
              logic is the open-source <code>@agent-relay/events-shim</code> package, so you can also mount the tools inside
              your own MCP server. See the <Link href="/docs/self-hosting">self-hosting docs</Link>.
            </p>
            <p>
              <strong>Agents.</strong> It works with Claude Code, Codex, opencode and the other harnesses Agent Relay delivers
              to, whether they run locally or in your sandboxes. We maintain the quirks of each one so you don&apos;t have to.
            </p>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.numeral}>iv</span> Pricing
          </h2>
          <div className={s.prose}>
            <p>
              Priced by message volume, not seats: agents are programmatic, so per-seat pricing doesn&apos;t fit. Self-hosted
              installs add a platform fee for setup and support. Start small and the price follows your volume as it grows.
            </p>
          </div>
          <div className={s.cta} style={{ justifyContent: 'flex-start' }}>
            <a className={s.ctaPrimary} href={`mailto:${SITE_EMAIL}?subject=Wake%20API`}>
              Get a quote
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
