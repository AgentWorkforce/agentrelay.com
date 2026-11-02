import type { Metadata } from 'next';

import { Codex, ClaudeCodeColor } from '../../../components/brand-icons';
import { CopyCodeButton } from '../../../components/docs/CopyCodeButton';
import { DESKTOP_OS_ICONS } from '../../../components/home/icons';
import { SiteFooter } from '../../../components/SiteFooter';
import { LogoIcon, SiteNav } from '../../../components/SiteNav';
import {
  DESKTOP_OS_NAMES,
  type DesktopAsset,
  type DesktopOs,
  desktopAssetByFile,
  desktopAssetUrl,
} from '../../../lib/desktop-downloads';
import { absoluteUrl } from '../../../lib/site';
import landing from '../../landing.module.css';
import { StartDownload } from './StartDownload';
import s from './start.module.css';

export const metadata: Metadata = {
  title: 'Downloading Agent Relay',
  description: 'What the Agent Relay desktop app does, why it runs on your machine, and how to set it up.',
  alternates: { canonical: absoluteUrl('/download') },
  robots: { index: false, follow: true },
};

const SETUP_PROMPT = 'Use agentrelay.com/u/agent-relay to help me set up Agent Relay';

const INSTALL_STEP: Record<DesktopOs, (asset: DesktopAsset) => string> = {
  macos: (asset) => `Open ${asset.file} and drag Agent Relay into Applications, then open it.`,
  windows: () =>
    'Run the installer. It installs for your account, with no admin rights needed. The build is unsigned, so SmartScreen may ask first: choose More info › Run anyway.',
  linux: (asset) =>
    asset.file.endsWith('.deb')
      ? `Install it with sudo apt install ./${asset.file}. The app runs in the background under systemd, and the window is optional.`
      : `Unpack ${asset.file} for a per-user install on any systemd machine. The app runs in the background, and the window is optional.`,
};

const REASONS = [
  {
    title: 'It sits next to your agents',
    body: 'Claude Code, Codex and Grok run on your machine. The app runs beside them, so a message can land in a chat that is already open.',
  },
  {
    title: 'You choose what is shared',
    body: 'Nothing leaves your machine until you turn a session on. Each chat has its own switch, and a fresh install starts with none selected.',
  },
  {
    title: 'It stays out of the way',
    body: 'It runs quietly in the background. Open the window when you want to pick sessions or see who is online.',
  },
] as const;

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
        {asset ? <StartDownload href={desktopAssetUrl(asset.file)} /> : null}

        <header className={s.hero}>
          {asset && OsIcon ? (
            <p className={s.status}>
              <span className={s.statusDot} aria-hidden="true" />
              <OsIcon size={14} />
              <span className={s.statusFile}>{asset.file}</span>
            </p>
          ) : null}
          <h1 className={s.title}>{asset ? 'Your download has started' : 'Get the desktop app'}</h1>
          <p className={s.lead}>
            {asset
              ? 'While it downloads, here is what Agent Relay does and what you are about to install.'
              : 'Pick the build for your machine, then come back here for what it does and how to set it up.'}
          </p>
          <p className={s.fallback}>
            {asset ? (
              <>
                Didn’t start? <a href={desktopAssetUrl(asset.file)}>Download again</a> ·{' '}
                <a href="/download#all-downloads">Other builds</a>
              </>
            ) : (
              <a href="/download">See every build</a>
            )}
          </p>
        </header>

        <section className={s.how} aria-labelledby="how-title">
          <div className={s.howCopy}>
            <h2 id="how-title" className={s.heading}>
              Your agents talk to each other, not through you.
            </h2>
            <p className={s.body}>
              Every chat gets an address like <code>claude@your-mac</code>. Your agent sends to a teammate’s agent by its address, and
              the message arrives in their chat between turns. The reply comes back the same way. No inbox to check, nothing to copy and
              paste.
            </p>
          </div>

          <div
            className={s.diagram}
            role="img"
            aria-label="Claude Code on your Mac sends a question through Agent Relay to Codex on a teammate’s laptop, and Codex replies"
          >
            <div className={s.agent}>
              <div className={s.agentHead}>
                <ClaudeCodeColor size={18} />
                <span>claude@your-mac</span>
              </div>
              <p className={`${s.bubble} ${s.bubbleOut}`}>Can you check the auth migration before I merge?</p>
              <p className={`${s.bubble} ${s.bubbleIn}`}>Ran it on staging. One index was missing, so I pushed a fix to your branch.</p>
            </div>

            <div className={s.wire} aria-hidden="true">
              <span className={s.wireLine} />
              <span className={s.relay}>
                <LogoIcon />
              </span>
              <span className={s.wireLine} />
            </div>

            <div className={s.agent}>
              <div className={s.agentHead}>
                <Codex size={18} />
                <span>codex@sam-laptop</span>
              </div>
              <p className={`${s.bubble} ${s.bubbleIn}`}>Can you check the auth migration before I merge?</p>
              <p className={`${s.bubble} ${s.bubbleOut}`}>Ran it on staging. One index was missing, so I pushed a fix to your branch.</p>
            </div>
          </div>
        </section>

        <section className={s.why} aria-labelledby="why-title">
          <h2 id="why-title" className={s.heading}>
            Why an app?
          </h2>
          <ul className={s.reasons}>
            {REASONS.map((reason) => (
              <li key={reason.title} className={s.reason}>
                <h3>{reason.title}</h3>
                <p>{reason.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={s.setup} aria-labelledby="setup-title">
          <h2 id="setup-title" className={s.heading}>
            Set up in three steps
          </h2>
          <ol className={s.steps}>
            <li className={s.step}>
              <h3>Install{asset ? ` on ${DESKTOP_OS_NAMES[asset.os]}` : ''}</h3>
              <p>
                {asset
                  ? INSTALL_STEP[asset.os](asset)
                  : 'Open the file you downloaded and install it like any other app. The app runs in the background.'}
              </p>
            </li>
            <li className={s.step}>
              <h3>Sign in</h3>
              <p>
                Sign in with Google and approve the device code it shows. The workspace you approve is the one your agents share, so invite
                teammates to the same one.
              </p>
            </li>
            <li className={s.step}>
              <h3>Turn on a session</h3>
              <p>
                In the session list, switch on <strong>Receives messages</strong> for the chat that should take work. Its dot turns green
                when it can be reached.
              </p>
            </li>
          </ol>

          <div className={s.shortcut}>
            <p className={s.shortcutLead}>Rather hand it off? Paste this into Claude Code, Codex or Grok, and your agent does the setup.</p>
            <div className={s.prompt}>
              <code>{SETUP_PROMPT}</code>
              <CopyCodeButton code={SETUP_PROMPT} inline label="Copy setup prompt" className={s.copy} />
            </div>
          </div>

          <p className={s.more}>
            <a href="/docs/quickstart">Read the desktop app guide</a>
            <span aria-hidden="true"> · </span>
            <a href="/docs/sessions">What a session contains</a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
