import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { cn } from '../../lib/utils';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import {
  LINUX_TARBALLS,
  detectDesktopDownload,
  downloadLabel,
  downloadsFor,
  platformName,
  type DesktopPlatform,
} from '../../lib/desktop-downloads';
import { defaultOgImage } from '../../lib/og-meta';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import s from './download.module.css';

// The recommendation comes from the request's User-Agent, so each visitor
// gets their platform's download in the first response.
export const dynamic = 'force-dynamic';

const TITLE = 'Download Agent Relay for macOS, Windows, and Linux';
const DESCRIPTION =
  'Download Agent Relay for macOS, Windows, or Linux. The same local relay for Claude Code, Codex, and your other agents on every desktop platform.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl('/download'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl('/download'),
    type: 'website',
    images: [defaultOgImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [defaultOgImage().url],
  },
};

const platforms: Array<{
  id: DesktopPlatform;
  name: string;
  blurb: string;
  note: string;
}> = [
  {
    id: 'macos',
    name: 'macOS',
    blurb: 'For Apple silicon and Intel Macs.',
    note: 'Requires macOS 13 or later. Open the disk image and drag Agent Relay to Applications.',
  },
  {
    id: 'windows',
    name: 'Windows',
    blurb: 'For Intel, AMD, and Arm PCs.',
    note: 'Windows 10 and 11. Unpack the .zip and run agent-relay.exe. Releases are not code-signed yet, so SmartScreen may ask once; Smart App Control must be off.',
  },
  {
    id: 'linux',
    name: 'Linux',
    blurb: 'For x64 and arm64 distributions.',
    note: 'Install the .deb with your package manager, or use a tarball if you prefer a relocatable install.',
  },
];

export default async function DownloadPage() {
  const requestHeaders = await headers();
  const detected = detectDesktopDownload({
    userAgent: requestHeaders.get('user-agent') ?? '',
    platform: requestHeaders.get('sec-ch-ua-platform'),
    architecture: requestHeaders.get('sec-ch-ua-arch'),
  });

  return (
    <div className={s.page}>
      <SiteNav />

      <main className={s.main}>
        <section className={s.hero}>
          <p className={s.eyebrow}>Agent Relay Desktop</p>
          <h1 className={s.headline}>Download Agent Relay</h1>
          <p className={s.lead}>
            The same window for your local agents on macOS, Windows, and Linux. Sign in once and your
            sessions, agents, and messages are there.
          </p>

          {detected ? (
            <div className={s.recommendation}>
              <p className={s.detected}>
                Detected {platformName(detected.platform)}
                {detected.arch === 'arm64' ? ' on Arm' : ''}
              </p>
              <a className={s.primary} href={detected.url}>
                {downloadLabel(detected)}
              </a>
              <p className={s.installNote}>{detected.installNote}</p>
              {detected.platform === 'windows' ? (
                <p className={s.warning}>
                  Windows builds are not code-signed yet: SmartScreen may show <em>Windows protected your PC</em>{' '}
                  once. Choose <strong>More info</strong> → <strong>Run anyway</strong>.
                </p>
              ) : null}
            </div>
          ) : (
            <p className={s.choose}>Choose the download for your computer.</p>
          )}
        </section>

        <section className={s.platforms} aria-label="All downloads">
          {platforms.map((platform) => {
            const items = downloadsFor(platform.id);
            const isRecommended = detected?.platform === platform.id;

            return (
              <article
                key={platform.id}
                className={cn(s.platform, isRecommended && s.platformRecommended)}
              >
                <header className={s.platformHeader}>
                  <h2>{platform.name}</h2>
                  <p>{platform.blurb}</p>
                </header>

                <div className={s.choices}>
                  {items.map((item) => {
                    const isRecommendedChoice =
                      detected?.platform === item.platform && detected.arch === item.arch;

                    return (
                      <a
                        key={`${item.platform}-${item.arch}`}
                        className={cn(s.choice, isRecommendedChoice && s.choiceRecommended)}
                        href={item.url}
                        aria-label={`${downloadLabel(item)} — ${item.filename}`}
                      >
                        <span className={s.choiceArch}>{item.archLabel}</span>
                        <span className={s.choiceFormat}>.{item.format}</span>
                      </a>
                    );
                  })}
                </div>

                {platform.id === 'linux' ? (
                  <p className={s.alternative}>
                    Prefer a tarball? <a href={LINUX_TARBALLS.x64}>x64</a> or <a href={LINUX_TARBALLS.arm64}>arm64</a>
                  </p>
                ) : null}

                <p className={s.platformNote}>{platform.note}</p>
              </article>
            );
          })}
        </section>

        <section className={s.releaseNote}>
          <p>
            Every link points at the latest release, so it always serves the newest version. Each release also
            publishes version-pinned files and a SHA-256 checksum for every download.
          </p>
          <p>
            <a href="https://github.com/AgentWorkforce/relay-desktop-releases/releases/latest">
              See the latest release, checksums, and version history
            </a>
          </p>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
