import type { Metadata } from 'next';
import Link from 'next/link';
import { GitHubStarsBadge } from '../../components/GitHubStars';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { absoluteUrl } from '../../lib/site';
import s from '../legal.module.css';

export const metadata: Metadata = {
  title: 'Security and trust — Agent Relay',
  description: 'Current Agent Relay controls, data handling, and enterprise readiness.',
  alternates: { canonical: absoluteUrl('/trust') },
};

export default function Page() {
  return (
    <div className={s.page}>
      <SiteNav actions={<GitHubStarsBadge />} />
      <main className={s.content}>
        <p className={s.meta}>Last reviewed: October 14, 2026</p>
        <h1 className={s.title}>Security and trust</h1>
        <p className={s.subtitle}>Current capabilities and open enterprise-readiness work. Items marked ⏳ are pending and are not available commitments.</p>
        <section className={s.section}>
          <h2>Agent controls</h2>
          <p>RelayAuth supports scoped agent credentials. Cloud supports cancellation of individual workflow runs and revocation of individual tokens. Human approval gates can be configured per flow; approval is not a universal requirement for every write.</p>
          <p>Cloud sign-in uses Google OAuth. Organization roles are owner and member. Workflow run history is available; it is not a comprehensive customer-visible security audit log.</p>
          <p>⏳ Workspace-wide emergency controls, general read-only/suggest mode, enterprise SSO (SAML/OIDC), and a customer-visible security audit log.</p>
        </section>
        <section className={s.section}>
          <h2>Deployment and data flow</h2>
          <p>The hosted Cloud product connects authorized integrations, executes agent workflows in sandboxes, and records run data. Connected tools and model providers receive data required for the requested work. Cloud supports bring-your-own model keys.</p>
          <p>The open-source core and Software Factory can run in your infrastructure. External integrations and model APIs still receive data when you configure them. The full Cloud product does not currently have self-host packaging.</p>
          <p>⏳ Single-tenant and private-cloud packaging for the full Cloud product.</p>
        </section>
        <section className={s.section}>
          <h2>Data protection and retention</h2>
          <p>Cloud uses Cloudflare and AWS infrastructure and a Neon database. Confirm region and feature-specific data flows with us before a pilot.</p>
          <p>Workspace run-data retention is configurable. Its default is to keep data indefinitely. Account deletion currently records a request for manual handling; automated completion is pending.</p>
          <p>Review the <Link href="/privacy">privacy policy</Link> for collection, model processing, retention, and deletion details, and <Link href="/telemetry">telemetry documentation</Link> for opt-out instructions.</p>
          <p>⏳ A contractual no-training clause and confirmed zero-data-retention coverage for all model providers. We do not represent these as completed.</p>
        </section>
        <section className={s.section}>
          <h2>Provider inventory — unconfirmed</h2>
          <p>This is a preliminary inventory from repository evidence, not a finalized subprocessor register. Actual production use, processing locations, contracting entities, and downstream model providers require confirmation. Not every provider is used for every customer.</p>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead><tr><th>Providers</th><th>Potential processing purpose</th><th>Verification</th></tr></thead>
              <tbody>
                <tr><td>Cloudflare, AWS, Neon</td><td>Hosting, storage, database, networking</td><td>Locations and production scope unconfirmed</td></tr>
                <tr><td>Daytona, E2B, Vercel Sandbox, Freestyle, Agent37, Microsandbox</td><td>Agent execution</td><td>Active providers and locations unconfirmed</td></tr>
                <tr><td>Anthropic, OpenAI, xAI, Google Gemini, OpenRouter, Cursor</td><td>Model inference; OpenAI session embeddings</td><td>Routing, locations, and retention terms unconfirmed</td></tr>
                <tr><td>Nango, Composio, GitHub, Slack, Dropbox</td><td>Authorized integrations and data movement</td><td>Feature-specific scope unconfirmed</td></tr>
                <tr><td>Recall.ai, Modal, Hookdeck</td><td>Meeting recording, transcription, webhooks</td><td>Feature-specific scope and locations unconfirmed</td></tr>
                <tr><td>Supermemory, Typesafe.ai</td><td>Agent memory and session evaluation</td><td>Production traffic unconfirmed</td></tr>
                <tr><td>Stripe, PostHog, Resend</td><td>Billing, analytics, transactional email</td><td>Locations and contract details unconfirmed</td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <section className={s.section}>
          <h2>Compliance and security review</h2>
          <p>⏳ SOC 2 platform and auditor engagement, audit dates, and penetration-test attestation. No completed SOC 2 or penetration-test claim is made here.</p>
          <p>For a pilot, agree the data boundary, integration scopes, approval gates, retention, and support terms with us before granting access.</p>
          <p>Report vulnerabilities through our <Link href="/security">vulnerability disclosure policy</Link>.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
