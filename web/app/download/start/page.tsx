import type { Metadata } from 'next';
import Link from 'next/link';
import { LockKeyhole, MessagesSquare, MonitorCog } from 'lucide-react';

import { AGENT_TOOLS, type AgentTool } from '../../../components/home/AgentMarks';
import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import { desktopAssetByFile, desktopAssetUrl } from '../../../lib/desktop-downloads';
import { absoluteUrl } from '../../../lib/site';
import { DownloadMarker } from './DownloadMarker';
import s from './start.module.css';

export const metadata: Metadata = {
  title: 'Downloading Agent Relay',
  description: 'What the Agent Relay app does on your computer, and what to do once it has downloaded.',
  alternates: { canonical: absoluteUrl('/download') },
  robots: { index: false, follow: true },
};

/** The agents shown under "Works with the agents you already use", in order. */
const AGENTS: AgentTool[] = ['claude', 'codex', 'cursor', 'grok', 'opencode', 'devin'];

type PageProps = { searchParams: Promise<{ build?: string | string[] }> };

export default async function DownloadStartPage({ searchParams }: PageProps) {
  const { build } = await searchParams;
  const asset = desktopAssetByFile(typeof build === 'string' ? build : undefined);

  return (
    <div className={s.page}>
      <main id="main" className={s.side}>
        <Link href="/" className={s.brand} aria-label="Agent Relay home">
          <LogoIcon />
          <LogoWordmark />
        </Link>

        <div className={s.content}>
          <h1 className={s.title}>Let your agents talk to each other</h1>

          {asset ? (
            <div className={s.status}>
              <DownloadMarker href={desktopAssetUrl(asset.file)} />
              <span>Download started</span>
            </div>
          ) : (
            <p className={s.status}>
              <a href="/download">Get the app for your machine</a>
            </p>
          )}

          <p className={s.lead}>When it finishes, open Agent Relay and sign in. It connects your agents from there.</p>

          {asset ? (
            <p className={s.fallback}>
              Didn’t start? <a href={desktopAssetUrl(asset.file)}>Download again</a> ·{' '}
              <a href="/download#all-downloads">Other builds</a>
            </p>
          ) : null}
        </div>
      </main>

      <aside className={s.explainer} aria-labelledby="explainer-title">
        <h2 id="explainer-title" className="sr-only">
          What Agent Relay does on your computer
        </h2>
        <ul className={s.facts}>
          <li className={s.fact}>
            <span className={s.factIcon} aria-hidden="true">
              <MonitorCog />
            </span>
            <div>
              <h3>Runs quietly in the background</h3>
              <p>Keep working in your terminal and editor as usual. The window is there when you want it.</p>
            </div>
          </li>
          <li className={s.fact}>
            <span className={s.factIcon} aria-hidden="true">
              <MessagesSquare />
            </span>
            <div>
              <h3>Works with the agents you already use</h3>
              <p>Ask your agent to check with a teammate’s agent. The answer comes back in your chat, so you stop copying between them.</p>
              <ul className={s.agents} aria-label="Works with">
                {AGENTS.map((tool) => (
                  <li key={tool} title={AGENT_TOOLS[tool].name}>
                    {AGENT_TOOLS[tool].logo}
                    <span className="sr-only">{AGENT_TOOLS[tool].name}</span>
                  </li>
                ))}
                <li className={s.more}>and more</li>
              </ul>
            </div>
          </li>
          <li className={s.fact}>
            <span className={s.factIcon} aria-hidden="true">
              <LockKeyhole />
            </span>
            <div>
              <h3>Shares only what you choose</h3>
              <p>A new install shares no sessions. You switch each chat on yourself, and can switch it off any time.</p>
            </div>
          </li>
        </ul>
      </aside>
    </div>
  );
}
