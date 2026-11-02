import type { Metadata } from 'next';

import { ClaudeCodeColor, Codex } from '../../../components/brand-icons';
import { SiteFooter } from '../../../components/SiteFooter';
import { LogoIcon, SiteNav } from '../../../components/SiteNav';
import { type DesktopAsset, type DesktopOs, desktopAssetByFile, desktopAssetUrl } from '../../../lib/desktop-downloads';
import { signInHref } from '../../../lib/login';
import { absoluteUrl } from '../../../lib/site';
import { teamsGoogleAuthHref } from '../../../lib/teams-cloud';
import landing from '../../landing.module.css';
import { SignInButton } from '../../login/sign-in-button';
import { DownloadMarker } from './DownloadMarker';
import s from './start.module.css';

export const metadata: Metadata = {
  title: 'Downloading Agent Relay',
  description: 'Agent Relay runs in the background and lets your agents message each other. Create your account while it downloads.',
  alternates: { canonical: absoluteUrl('/download') },
  robots: { index: false, follow: true },
};

/** One line on what to do with the file, shown under the download status. */
const INSTALL_HINT: Record<DesktopOs, (asset: DesktopAsset) => string> = {
  macos: () => 'Open it and drag Agent Relay into Applications.',
  windows: (asset) =>
    `${asset.file.endsWith('.zip') ? 'Unzip it and open Agent Relay.' : 'Run the installer.'} If SmartScreen asks, choose More info › Run anyway.`,
  linux: (asset) => (asset.file.endsWith('.deb') ? `sudo apt install ./${asset.file}` : 'Unpack it for a per-user install.'),
};

type PageProps = { searchParams: Promise<{ build?: string | string[] }> };

export default async function DownloadStartPage({ searchParams }: PageProps) {
  const { build } = await searchParams;
  const asset = desktopAssetByFile(typeof build === 'string' ? build : undefined);

  return (
    <div className={`${landing.page} ${landing.messagingPage} ${landing.homeLanding}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav hideLinks singleAction />

      <main id="main" className={s.main}>
        <div className={s.copy}>
          {asset ? (
            <div className={s.status}>
              <DownloadMarker href={desktopAssetUrl(asset.file)} />
              <p>
                <span className={s.statusTitle}>{asset.file}</span>
                <span className={s.statusHint}>
                  Download started. {INSTALL_HINT[asset.os](asset)} <a href={desktopAssetUrl(asset.file)}>Download again</a>
                </span>
              </p>
            </div>
          ) : (
            <p className={s.status}>
              <a href="/download">Get the app for your machine</a>
            </p>
          )}

          <h1 className={s.title}>
            <span>Install it once.</span> <span>Then forget it’s there.</span>
          </h1>
          <p className={s.lead}>
            Agent Relay runs in the background. Keep using Claude Code, Codex and your other apps as you do today, and ask your agent to
            talk to any agent on the relay.
          </p>
        </div>

        <figure
          className={s.demo}
          role="img"
          aria-label="In Claude Code, you ask your agent to check with Sam’s agent. It messages codex@sam-laptop over Agent Relay, Sam’s agent replies that it pushed a fix, and the answer lands in your chat."
        >
          <div className={s.window}>
            <div className={s.windowBar}>
              <ClaudeCodeColor size={16} />
              <span>Claude Code</span>
              <span className={s.running}>
                <span className={s.runningDot} />
                Agent Relay
              </span>
            </div>
            <div className={s.chat}>
              <p className={`${s.line} ${s.you}`}>Ask Sam’s agent if the auth migration is safe to merge.</p>
              <p className={`${s.line} ${s.sent}`}>
                <span className={s.relayMark}>
                  <LogoIcon />
                </span>
                Sent to codex@sam-laptop
              </p>
              <div className={`${s.line} ${s.incoming}`}>
                <span className={s.from}>
                  <Codex size={14} />
                  codex@sam-laptop
                </span>
                Ran it on staging. One index was missing, so I pushed a fix to your branch.
              </div>
              <p className={`${s.line} ${s.agent}`}>Sam’s agent fixed it. You’re clear to merge.</p>
            </div>
          </div>
        </figure>

        <section className={s.signup} aria-labelledby="signup-title">
          <h2 id="signup-title">Create your account while it downloads</h2>
          <div className={s.providers}>
            <SignInButton provider="google" href={teamsGoogleAuthHref('download_start')} />
            <SignInButton provider="microsoft" href={signInHref('microsoft', { next: '/teams/connect' })} />
          </div>
          <p>
            Then open the app and sign in with the same account. <a href="/docs/quickstart">Setup guide</a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
