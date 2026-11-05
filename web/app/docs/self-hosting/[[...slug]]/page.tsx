import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { Card } from '../../../../components/docs/Card';
import { CardGroup } from '../../../../components/docs/CardGroup';
import { CopyCodeButton } from '../../../../components/docs/CopyCodeButton';
import { Note } from '../../../../components/docs/Note';
import { TableOfContents } from '../../../../components/docs/TableOfContents';
import styles from '../../../../components/docs/docs.module.css';
import type { TocItem } from '../../../../lib/docs';
import {
  CLOUD_MCP_URL,
  CLOUD_SESSION_COOKIE,
  fetchSelfhostDocs,
  GUIDED_INSTALL_DOCS,
  orderSelfhostDocs,
  parseSelfhostSlug,
  SELFHOST_ACCESS_EMAIL,
  SELFHOST_HELM_CHART,
  SELFHOST_HELM_CHART_SOURCE,
  selfhostDocPath,
  type SelfhostDoc,
  type SelfhostDocSummary,
  selfhostLoginHref,
  validCloudSession,
} from '../../../../lib/selfhost-docs';
import { renderSelfhostMarkdown } from '../../../../lib/selfhost-markdown';
import s from './self-hosting.module.css';

// Per-reader content behind Cloud's session and the organization's self-host
// entitlement: never prerendered, never cached. next.config.mjs adds
// Cache-Control: private, no-store and X-Robots-Tag: noindex to every
// /docs/self-hosting response, and the runbook text arrives from Cloud per
// request, so it never exists in the build output.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// One generic title for every state, so even the <title> of a signed-out or
// unentitled response names no runbook.
export const metadata: Metadata = {
  title: 'Self-hosting',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

function setupAgentPrompt(cloud: string, doc: string): string {
  return `Use the ask_customer_support tool to walk me through the guided self-hosted Agent Relay install on ${cloud} (selfhost:${doc}), one verified stage at a time.`;
}
const CLAUDE_CODE_MCP_COMMAND = `claude mcp add --transport http agent-relay ${CLOUD_MCP_URL}`;

export default async function SelfHostingPage({ params }: PageProps) {
  const { slug } = await params;
  const route = parseSelfhostSlug(slug);
  if (!route) notFound();

  const session = (await cookies()).get(CLOUD_SESSION_COOKIE)?.value;
  if (!validCloudSession(session)) redirect(selfhostLoginHref(route.doc));

  const result = await fetchSelfhostDocs(session, route.doc);
  switch (result.kind) {
    case 'unauthenticated':
      redirect(selfhostLoginHref(route.doc));
    case 'forbidden':
      return <AccessPage />;
    case 'unavailable':
      return <UnavailablePage />;
    case 'not_found':
      notFound();
    case 'ok': {
      const docs = orderSelfhostDocs(result.docs);
      return result.doc ? <RunbookPage doc={result.doc} docs={docs} /> : <OverviewPage docs={docs} />;
    }
  }
}

/** Signed in, but the current organization has no self-hosting entitlement. No runbook names or text. */
function AccessPage() {
  const mailto = `mailto:${SELFHOST_ACCESS_EMAIL}?${new URLSearchParams({ subject: 'Self-hosting access' }).toString().replace(/\+/g, '%20')}`;
  return (
    <div className={styles.articleWrapper}>
      <article className={styles.article}>
        <div className={styles.articleHeader}>
          <div className={styles.articleHeading}>
            <h1>Self-hosting Agent Relay</h1>
          </div>
        </div>
        <p className={styles.articleDescription}>
          The self-hosting runbooks are available to organizations with an Agent Relay self-hosting agreement.
        </p>
        <div className={styles.articleBody}>
          <p>Your current organization doesn&rsquo;t have access to them yet.</p>
          <div className={s.actions}>
            <a className={s.primaryAction} href={mailto}>
              Request access
            </a>
            <a className={s.secondaryAction} href="/cloud/dashboard">
              Open Agent Relay Cloud
            </a>
          </div>
          <Note>
            If your company already has self-hosting access, switch to one of its workspaces in Agent Relay Cloud,
            then reload this page. Access follows the organization of your current workspace.
          </Note>
          <p>
            To talk about running Agent Relay in your own cloud account, email{' '}
            <a href={mailto}>{SELFHOST_ACCESS_EMAIL}</a>.
          </p>
        </div>
      </article>
    </div>
  );
}

function UnavailablePage() {
  return (
    <div className={styles.articleWrapper}>
      <article className={styles.article}>
        <div className={styles.articleHeader}>
          <div className={styles.articleHeading}>
            <h1>Self-hosting Agent Relay</h1>
          </div>
        </div>
        <p className={styles.articleDescription} role="status">
          The self-hosting docs are temporarily unavailable. Reload the page in a minute.
        </p>
      </article>
    </div>
  );
}

function RunbookNav({ docs, active }: { docs: SelfhostDocSummary[]; active?: string }) {
  return (
    <nav className={s.runbookNav} aria-label="Self-hosting runbooks">
      <p className={styles.tocTitle}>Self-hosting</p>
      <ul className={s.runbookList}>
        <li>
          <Link
            href={selfhostDocPath()}
            prefetch={false}
            className={`${s.runbookLink} ${active === undefined ? s.runbookLinkActive : ''}`}
            aria-current={active === undefined ? 'page' : undefined}
          >
            Overview
          </Link>
        </li>
        {docs.map((doc) => (
          <li key={doc.name}>
            <Link
              href={selfhostDocPath(doc.name)}
              prefetch={false}
              className={`${s.runbookLink} ${active === doc.name ? s.runbookLinkActive : ''}`}
              aria-current={active === doc.name ? 'page' : undefined}
            >
              {doc.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Entitled layout. `ph-sensitive` is the PostHog session-recording block
 * selector (app/WebsitePostHogProvider.tsx), so replays never capture runbook
 * text, and `ph-no-capture` keeps autocapture from sending clicked element text.
 */
function EntitledShell({
  title,
  description,
  docs,
  active,
  toc,
  children,
}: {
  title: string;
  description: string;
  docs: SelfhostDocSummary[];
  active?: string;
  toc: TocItem[];
  children: ReactNode;
}) {
  return (
    <div className={`${styles.articleWrapper} ph-sensitive ph-no-capture`}>
      <article className={styles.article}>
        <p className={s.eyebrow}>
          <Link href={selfhostDocPath()} prefetch={false}>
            Self-hosting
          </Link>
          <span className={s.badge}>Customer docs</span>
        </p>
        <div className={styles.articleHeader}>
          <div className={styles.articleHeading}>
            <h1>{title}</h1>
          </div>
        </div>
        <p className={styles.articleDescription}>{description}</p>
        <div className={s.mobileNav}>
          <RunbookNav docs={docs} active={active} />
        </div>
        <div className={styles.articleBody}>{children}</div>
      </article>
      <aside className={styles.tocSidebar}>
        <div className={s.sideNav}>
          <RunbookNav docs={docs} active={active} />
        </div>
        {toc.length > 0 && <TableOfContents items={toc} showLanguage={false} />}
      </aside>
    </div>
  );
}

function CommandBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className={styles.codeWrapper}>
      <CopyCodeButton code={code} label={label} />
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

const OVERVIEW_TOC: TocItem[] = [
  { id: 'architecture', text: 'Architecture', level: 2 },
  { id: 'helm-chart', text: 'Helm chart', level: 2 },
  { id: 'setup-agent', text: 'Ask the setup agent', level: 2 },
  { id: 'runbooks', text: 'Runbooks', level: 2 },
];

function OverviewPage({ docs }: { docs: SelfhostDocSummary[] }) {
  return (
    <EntitledShell
      title="Self-hosting Agent Relay"
      description="Run Agent Relay in your own cloud account, on Google Cloud (GKE) or AWS (EKS), with the agent-relay Helm chart. These runbooks are the same ones the setup agent follows."
      docs={docs}
      toc={OVERVIEW_TOC}
    >
      <CardGroup cols={2}>
        <Card title="Install on Google Cloud (GKE)" href={selfhostDocPath('gke-install-runbook')} prefetch={false}>
          What you need and every step, from prerequisites to the end-to-end check.
        </Card>
        <Card title="Install on AWS (EKS)" href={selfhostDocPath('eks-install')} prefetch={false}>
          What you need and every step, from prerequisites to the end-to-end check.
        </Card>
        <Card title="Ask the setup agent" href="#setup-agent">
          Let your coding agent run the guided install, one verified stage at a time.
        </Card>
        <Card title="Helm chart" href={SELFHOST_HELM_CHART_SOURCE}>
          <code>{SELFHOST_HELM_CHART}</code>
        </Card>
      </CardGroup>

      <h2 id="architecture">Architecture</h2>
      <p>
        One chart installs the dashboard, the control-plane API (relay-cloud-api), messaging (relaycast), session
        history (relayhistory) and auth (relayauth) in a single namespace behind one HTTPS load balancer, on GKE or
        EKS. Relayflows is opt-in. Dashed parts of the diagram are optional.
      </p>
      <figure className={s.diagram}>
        <a href="/img/self-hosting/agent-relay-architecture.svg" target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG diagram, opened full size on click */}
          <img
            src="/img/self-hosting/agent-relay-architecture.svg"
            alt="Agent Relay self-hosted architecture, drawn for GKE: clients, the HTTPS load balancer, and the relay-dashboard, relay-cloud-api, relaycast, relayhistory, relayauth and opt-in relayflows services with their data stores"
            loading="lazy"
          />
        </a>
        <figcaption>
          Components and data stores, drawn for GKE. On EKS the same services run behind an ALB with an ACM
          certificate, with Pod Identity instead of Workload Identity, S3 instead of GCS, and PostgreSQL on
          RDS/Aurora or CloudNativePG instead of Cloud SQL. Select the diagram to open it full size.
        </figcaption>
      </figure>
      <figure className={s.diagram}>
        <a href="/img/self-hosting/agent-relay-request-flow.svg" target="_blank" rel="noopener">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG diagram, opened full size on click */}
          <img
            src="/img/self-hosting/agent-relay-request-flow.svg"
            alt="Agent Relay self-hosted request flow: sign-in, dashboard, Desktop session upload and agent messaging across the deployed services"
            loading="lazy"
          />
        </a>
        <figcaption>How a request moves through the install.</figcaption>
      </figure>

      <h2 id="helm-chart">Helm chart</h2>
      <p>
        The chart is published as an OCI artifact. Read its default values before you write your own; the install
        runbook gives the exact values and order for each environment.
      </p>
      <CommandBlock code={`helm show values ${SELFHOST_HELM_CHART} --version <chart-version>`} />
      <p>
        Source and release notes: <a href={SELFHOST_HELM_CHART_SOURCE}>AgentWorkforce/helm-charts</a>.
      </p>

      <h2 id="setup-agent">Ask the setup agent</h2>
      <p>
        The setup agent walks your own coding agent through the guided install on{' '}
        <Link href={selfhostDocPath(GUIDED_INSTALL_DOCS[0].name)} prefetch={false}>GKE</Link> or{' '}
        <Link href={selfhostDocPath(GUIDED_INSTALL_DOCS[1].name)} prefetch={false}>EKS</Link>. Your agent runs the commands
        with your credentials; the setup agent checks each stage&rsquo;s output before the next one, and stops for
        your go-ahead before anything that changes your cloud account. It never asks for secret values.
      </p>
      <ol>
        <li>
          Add the Agent Relay Cloud MCP server to your coding agent and sign in with an account in this organization.
          In Claude Code:
          <CommandBlock code={CLAUDE_CODE_MCP_COMMAND} label="Copy command" />
          Other clients: add <code>{CLOUD_MCP_URL}</code> as a remote MCP server (see{' '}
          <Link href="/docs/claude-connector">Claude connector</Link>).
        </li>
        <li>
          Ask your agent, for your cloud:
          {GUIDED_INSTALL_DOCS.map((guided) => (
            <div key={guided.name}>
              <p>{guided.label}:</p>
              <CommandBlock code={setupAgentPrompt(guided.cloud, guided.name)} label="Copy prompt" />
            </div>
          ))}
        </li>
      </ol>
      <Note>
        The setup agent reads these runbooks only for organizations with self-hosting access, the same check that
        protects this page.
      </Note>

      <h2 id="runbooks">Runbooks</h2>
      <CardGroup cols={2}>
        {docs.map((doc) => (
          <Card key={doc.name} title={doc.title} href={selfhostDocPath(doc.name)} prefetch={false} />
        ))}
      </CardGroup>
    </EntitledShell>
  );
}

function RunbookPage({ doc, docs }: { doc: SelfhostDoc; docs: SelfhostDocSummary[] }) {
  const { content, toc } = renderSelfhostMarkdown(doc.markdown);
  return (
    <EntitledShell
      title={doc.title}
      description="Self-hosting runbook for customers. The setup agent follows the same text."
      docs={docs}
      active={doc.name}
      toc={toc}
    >
      {content}
      <hr />
      <p className={s.footerNote}>
        Stuck?{' '}
        <Link href={`${selfhostDocPath()}#setup-agent`} prefetch={false}>Ask the setup agent</Link> or open{' '}
        <Link href={selfhostDocPath('support-and-escalation')} prefetch={false}>support and escalation</Link>.
      </p>
    </EntitledShell>
  );
}
