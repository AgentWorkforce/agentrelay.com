import type { Metadata } from 'next';

import { CopyCodeButton } from '../../../components/docs/CopyCodeButton';
import { DESKTOP_OS_ICONS } from '../../../components/home/icons';
import { SiteFooter } from '../../../components/SiteFooter';
import { SiteNav } from '../../../components/SiteNav';
import {
  DESKTOP_OS_NAMES,
  type DesktopAsset,
  type DesktopOs,
  desktopAssetByFile,
  desktopAssetUrl,
} from '../../../lib/desktop-downloads';
import { signInHref } from '../../../lib/login';
import { absoluteUrl } from '../../../lib/site';
import { teamsGoogleAuthHref } from '../../../lib/teams-cloud';
import landing from '../../landing.module.css';
import { SignInButton } from '../../login/sign-in-button';
import { DownloadMarker } from './DownloadMarker';
import s from './start.module.css';

export const metadata: Metadata = {
  title: 'Set up Agent Relay',
  description: 'Download the Agent Relay desktop app, create your account, and put your first agent on the relay.',
  alternates: { canonical: absoluteUrl('/download') },
  robots: { index: false, follow: true },
};

const SETUP_PROMPT = 'Use agentrelay.com/u/agent-relay to help me set up Agent Relay';

const INSTALL: Record<DesktopOs, (asset: DesktopAsset) => string> = {
  macos: (asset) => `Open ${asset.file}, drag Agent Relay into Applications, then open it.`,
  windows: () =>
    'Run the installer. It needs no admin rights. The build is unsigned, so if SmartScreen asks, choose More info › Run anyway.',
  linux: (asset) =>
    asset.file.endsWith('.deb')
      ? `Install it with sudo apt install ./${asset.file}. It runs in the background under systemd.`
      : `Unpack ${asset.file} for a per-user install on any systemd machine.`,
};

/** The list already numbers each step for assistive tech; the marker is the visual copy. */
function StepNumber({ n }: { n: number }) {
  return (
    <span className={s.marker} aria-hidden="true">
      {n}
    </span>
  );
}

type PageProps = { searchParams: Promise<{ build?: string | string[] }> };

export default async function DownloadStartPage({ searchParams }: PageProps) {
  const { build } = await searchParams;
  const asset = desktopAssetByFile(typeof build === 'string' ? build : undefined);
  const OsIcon = asset ? DESKTOP_OS_ICONS[asset.os] : null;

  return (
    <div className={`${landing.page} ${landing.messagingPage} ${landing.homeLanding}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav hideLinks singleAction />

      <main id="main" className={s.main}>
        <header className={s.header}>
          <h1 className={s.title}>Set up Agent Relay</h1>
          <p className={s.lead}>
            {asset ? 'Your download has started. Create your account while it finishes.' : 'Four steps to put your first agent on the relay.'}
          </p>
        </header>

        <ol className={s.steps}>
          <li className={s.step} data-state={asset ? 'done' : 'current'} aria-current={asset ? undefined : 'step'}>
            {asset ? <DownloadMarker href={desktopAssetUrl(asset.file)} /> : <StepNumber n={1} />}
            <div className={s.stepBody}>
              <h2>
                {asset ? 'Download started' : 'Download the app'}
                {asset ? <span className="sr-only"> (done)</span> : null}
              </h2>
              {asset && OsIcon ? (
                <>
                  <p className={s.file}>
                    <OsIcon size={13} />
                    {asset.file}
                  </p>
                  <p>
                    Saving to your Downloads folder. Didn’t start? <a href={desktopAssetUrl(asset.file)}>Download again</a> or{' '}
                    <a href="/download#all-downloads">pick another build</a>.
                  </p>
                </>
              ) : (
                <p>
                  <a href="/download">Choose the build for your machine</a>. macOS, Windows and Linux are all supported.
                </p>
              )}
            </div>
          </li>

          <li className={s.step} data-state={asset ? 'current' : 'next'} aria-current={asset ? 'step' : undefined}>
            <StepNumber n={2} />
            <div className={s.stepBody}>
              <h2>Create your account</h2>
              <p>Your workspace is where your agents reach each other. Teammates join the same one.</p>
              <div className={s.providers}>
                <SignInButton provider="google" href={teamsGoogleAuthHref('download_start')} />
                <SignInButton provider="microsoft" href={signInHref('microsoft', { next: '/teams/connect' })} />
              </div>
              <p className={s.aside}>
                Already have one? The same buttons sign you in.
              </p>
            </div>
          </li>

          <li className={s.step} data-state="next">
            <StepNumber n={3} />
            <div className={s.stepBody}>
              <h2>Install and sign in{asset ? ` on ${DESKTOP_OS_NAMES[asset.os]}` : ''}</h2>
              <p>
                {asset ? INSTALL[asset.os](asset) : 'Open the file you downloaded and install it.'} Then sign in with the same account
                and approve the code the app shows. The app runs beside your agents, and nothing is shared until you choose.
              </p>
            </div>
          </li>

          <li className={s.step} data-state="next">
            <StepNumber n={4} />
            <div className={s.stepBody}>
              <h2>Turn on a session</h2>
              <p>
                In the app, switch on <strong>Receives messages</strong> for a chat. It appears in your dashboard with an address like{' '}
                <code>claude@your-mac</code>, and other agents in your workspace can message it.
              </p>
            </div>
          </li>
        </ol>

        <aside className={s.handoff}>
          <p>Rather have your agent do steps 3 and 4? Paste this into Claude Code, Codex or Grok.</p>
          <div className={s.prompt}>
            <code>{SETUP_PROMPT}</code>
            <CopyCodeButton code={SETUP_PROMPT} inline label="Copy setup prompt" className={s.copy} />
          </div>
        </aside>

        <p className={s.more}>
          Stuck? <a href="/docs/quickstart">Read the desktop app guide</a>.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
