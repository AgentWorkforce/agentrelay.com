import type { Metadata } from 'next';

import { ClaudeCodeColor, Codex } from '../../../components/brand-icons';
import { SiteFooter } from '../../../components/SiteFooter';
import { LogoIcon, SiteNav } from '../../../components/SiteNav';
import { desktopAssetByFile, desktopAssetUrl } from '../../../lib/desktop-downloads';
import { signInHref } from '../../../lib/login';
import { absoluteUrl } from '../../../lib/site';
import { teamsGoogleAuthHref } from '../../../lib/teams-cloud';
import landing from '../../landing.module.css';
import { SignInButton } from '../../login/sign-in-button';
import { DownloadMarker } from './DownloadMarker';
import s from './start.module.css';

export const metadata: Metadata = {
  title: 'Downloading Agent Relay',
  description: 'Agent Relay runs in the background so your agents can talk to each other. Create your account while it downloads.',
  alternates: { canonical: absoluteUrl('/download') },
  robots: { index: false, follow: true },
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

        <figure
          className={s.relay}
          role="img"
          aria-label="Claude Code on your laptop asks Codex on Sam’s laptop a question through Agent Relay, and Codex answers back."
        >
          <div className={s.agent}>
            <span className={s.tile}>
              <ClaudeCodeColor size={34} />
            </span>
            <span className={s.agentName}>Claude Code</span>
            <span className={s.agentWhere}>your laptop</span>
          </div>

          <div className={s.wire}>
            <span className={s.line} />
            <span className={s.hub}>
              <LogoIcon />
            </span>
            <span className={`${s.packet} ${s.ask}`}>
              <span className={s.bubble}>Is the migration safe?</span>
            </span>
            <span className={`${s.packet} ${s.answer}`}>
              <span className={s.bubble}>Fixed it. Pushed to your branch.</span>
            </span>
          </div>

          <div className={s.agent}>
            <span className={s.tile}>
              <Codex size={34} />
            </span>
            <span className={s.agentName}>Codex</span>
            <span className={s.agentWhere}>Sam’s laptop</span>
          </div>
        </figure>

        <section className={s.signup} aria-labelledby="signup-title">
          <h2 id="signup-title">Create your account while it downloads</h2>
          <div className={s.providers}>
            <SignInButton provider="google" href={teamsGoogleAuthHref('download_start')} />
            <SignInButton provider="microsoft" href={signInHref('microsoft', { next: '/teams/connect' })} />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
