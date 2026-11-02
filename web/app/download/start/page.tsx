import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { AGENT_TOOLS, type AgentTool } from '../../../components/home/AgentMarks';
import { LogoIcon, LogoWordmark } from '../../../components/SiteNav';
import { desktopAssetByFile, desktopAssetUrl } from '../../../lib/desktop-downloads';
import { signInHref } from '../../../lib/login';
import { absoluteUrl } from '../../../lib/site';
import { teamsGoogleAuthHref } from '../../../lib/teams-cloud';
import { SignInButton } from '../../login/sign-in-button';
import { DownloadMarker } from './DownloadMarker';
import s from './start.module.css';

export const metadata: Metadata = {
  title: 'Downloading Agent Relay',
  description: 'Agent Relay runs in the background so your agents can talk to each other. Create your account while it downloads.',
  alternates: { canonical: absoluteUrl('/download') },
  robots: { index: false, follow: true },
};

/**
 * Every agent we connect, laid around the relay on the edge of a 5×5 grid,
 * clockwise from the top-left corner. `row`/`col` are grid lines (1-based).
 */
const RING: { tool: AgentTool | 'dots' | 'pi'; row: number; col: number }[] = [
  { tool: 'claude', row: 1, col: 1 },
  { tool: 'cursor', row: 1, col: 2 },
  { tool: 'grok', row: 1, col: 3 },
  { tool: 'devin', row: 1, col: 4 },
  { tool: 'codex', row: 1, col: 5 },
  { tool: 'opencode', row: 2, col: 5 },
  { tool: 'muse', row: 3, col: 5 },
  { tool: 'conductor', row: 4, col: 5 },
  { tool: 'hermes', row: 5, col: 5 },
  { tool: 'openclaw', row: 5, col: 4 },
  { tool: 'capy', row: 5, col: 3 },
  { tool: 'antigravity', row: 5, col: 2 },
  { tool: 'paseo', row: 5, col: 1 },
  { tool: 'grokbot', row: 4, col: 1 },
  { tool: 'dots', row: 3, col: 1 },
  { tool: 'pi', row: 2, col: 1 },
];

const EXTRA = {
  dots: { name: 'Dots', logo: <img src="/logos/dot.webp" alt="" /> },
  pi: { name: 'Pi', logo: <img className={s.mono} src="/logos/pi.svg" alt="" /> },
};

const agent = (tool: AgentTool | 'dots' | 'pi') => (tool === 'dots' || tool === 'pi' ? EXTRA[tool] : AGENT_TOOLS[tool]);

/**
 * The messages that play in a loop: each travels from its sender into the
 * relay and out to its recipient; the sender lights up as it sends and the
 * recipient as it lands. Indexes are
 * into RING; `at` is seconds into the cycle.
 */
const MESSAGES: { from: number; to: number; at: number }[] = [
  { from: 0, to: 4, at: 0 },
  { from: 4, to: 0, at: 1.8 },
  { from: 2, to: 9, at: 3.6 },
  { from: 6, to: 12, at: 5.4 },
  { from: 12, to: 6, at: 7.2 },
];

/** Grid-line position of a cell's centre, as a percentage of the grid (cells are 1, gaps 0.22). */
const centre = (line: number) => (((line - 1) * 1.22 + 0.5) / 5.88) * 100;

type PageProps = { searchParams: Promise<{ build?: string | string[] }> };

export default async function DownloadStartPage({ searchParams }: PageProps) {
  const { build } = await searchParams;
  const asset = desktopAssetByFile(typeof build === 'string' ? build : undefined);
  const names = RING.map(({ tool }) => agent(tool).name).join(', ');

  return (
    <div className={s.page}>
      <main id="main" className={s.side}>
        <Link href="/" className={s.brand} aria-label="Agent Relay home">
          <LogoIcon />
          <LogoWordmark />
        </Link>

        <div className={s.content}>
          {asset ? (
            <div className={s.status}>
              <DownloadMarker href={desktopAssetUrl(asset.file)} />
              <span>
                Download started · <a href={desktopAssetUrl(asset.file)}>Download again</a>
              </span>
            </div>
          ) : (
            <p className={s.status}>
              <a href="/download">Get the app for your machine</a>
            </p>
          )}

          <h1 className={s.title}>
            <span>Install it once.</span> <span>Then forget it’s there.</span>
          </h1>
          <p className={s.lead}>It runs in the background, so your agents can talk to each other.</p>

          <section className={s.signup} aria-labelledby="signup-title">
            <h2 id="signup-title">Create your account while it downloads</h2>
            <div className={s.providers}>
              <SignInButton provider="google" href={teamsGoogleAuthHref('download_start')} />
              <SignInButton provider="microsoft" href={signInHref('microsoft', { next: '/teams/connect' })} />
            </div>
          </section>
        </div>
      </main>

      <aside className={s.showcase}>
        <figure className={s.network} role="img" aria-label={`Agents connected through Agent Relay, messaging each other: ${names}.`}>
          <svg className={s.wires} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {RING.map(({ tool, row, col }) => (
              <line key={tool} x1="50" y1="50" x2={centre(col)} y2={centre(row)} />
            ))}
            {MESSAGES.flatMap(({ from, to, at }, i) => [
              <line
                key={`in-${i}`}
                className={s.pulseIn}
                x1="50"
                y1="50"
                x2={centre(RING[from].col)}
                y2={centre(RING[from].row)}
                pathLength={100}
                style={{ animationDelay: `${at}s` } as CSSProperties}
              />,
              <line
                key={`out-${i}`}
                className={s.pulseOut}
                x1="50"
                y1="50"
                x2={centre(RING[to].col)}
                y2={centre(RING[to].row)}
                pathLength={100}
                style={{ animationDelay: `${at + 0.6}s` } as CSSProperties}
              />,
            ])}
          </svg>

          {RING.map(({ tool, row, col }, i) => {
            const glows = MESSAGES.flatMap((m) => [...(m.from === i ? [m.at] : []), ...(m.to === i ? [m.at + 1.2] : [])]);
            return (
              <span
                key={tool}
                className={s.agent}
                style={{ gridRow: row, gridColumn: col } as CSSProperties}
                title={agent(tool).name}
              >
                {agent(tool).logo}
                {glows.map((at) => (
                  <span key={at} className={s.hit} style={{ animationDelay: `${at}s` } as CSSProperties} />
                ))}
              </span>
            );
          })}

          <span className={s.hub}>
            <LogoIcon />
          </span>
        </figure>
      </aside>
    </div>
  );
}
