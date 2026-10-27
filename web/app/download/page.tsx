import type { Metadata } from 'next';

import { WaveDivider } from '../../components/home/icons';
import sections from '../../components/home/home-sections.module.css';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { DESKTOP_ASSETS, type DesktopAsset, type DesktopOs, desktopAssetUrl } from '../../lib/desktop-downloads';
import { absoluteUrl } from '../../lib/site';
import { teamsGoogleAuthHref } from '../../lib/teams-cloud';
import s from '../landing.module.css';
import { DownloadButton } from './DownloadButton';
import d from './download.module.css';

const description =
  'Download the Agent Relay desktop app for macOS, Linux, or Windows. It connects the coding agents on your machine to your team’s relay.';

export const metadata: Metadata = {
  title: 'Download Agent Relay',
  description,
  alternates: { canonical: absoluteUrl('/download') },
  openGraph: { title: 'Download Agent Relay', description, url: absoluteUrl('/download') },
};

const PLATFORMS: readonly { os: DesktopOs; name: string; requirements: string; verify: string }[] = [
  {
    os: 'macos',
    name: 'macOS',
    requirements: 'macOS 13 Ventura or later.',
    verify: 'shasum -a 256 -c <file>.sha256',
  },
  {
    os: 'linux',
    name: 'Linux',
    requirements: 'glibc 2.34+ and GTK 4.6+. The background service runs under systemd.',
    verify: 'sha256sum -c <file>.sha256',
  },
  {
    os: 'windows',
    name: 'Windows',
    requirements:
      'Installs for your account without admin rights. The build is unsigned, so SmartScreen may ask you to confirm: choose More info › Run anyway.',
    verify: 'Get-FileHash <file>',
  },
];

function archName(asset: DesktopAsset): string {
  if (asset.os === 'macos') return asset.arch === 'arm64' ? 'Apple silicon' : 'Intel';
  return asset.arch === 'arm64' ? 'ARM64' : 'x64';
}

export default function DownloadPage() {
  return (
    <div className={`${s.page} ${s.messagingPage} ${s.homeLanding}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav
        hideLinks
        singleAction
        actions={
          <>
            <a className={`${s.ctaSecondary} ${s.homeNavAction}`} href="/login">
              Log in
            </a>
            <a className={`${s.ctaPrimary} ${s.homeNavAction}`} href={teamsGoogleAuthHref('download_nav')}>
              Sign up
            </a>
          </>
        }
      />

      <main id="main">
        <header className={d.hero}>
          <h1 className={d.heroTitle}>Download Agent Relay</h1>
          <p className={d.heroLine}>The desktop app connects the coding agents on your machine to your team’s relay.</p>
          <DownloadButton />
          <p className={d.agentInstall}>
            On macOS or Linux, your coding agent can install it for you. <a href="/signup/teams">Get the setup prompt</a>
          </p>
        </header>

        <div className={sections.waveBreak}>
          <WaveDivider />
        </div>

        <section className={d.catalog} id="all-downloads" aria-labelledby="all-downloads-title">
          <h2 id="all-downloads-title" className={d.catalogTitle}>
            All downloads
          </h2>
          <div className={d.platforms}>
            {PLATFORMS.map((platform) => (
              <div key={platform.os} className={d.platform}>
                <h3 className={d.platformName}>{platform.name}</h3>
                <ul className={d.builds}>
                  {DESKTOP_ASSETS.filter((asset) => asset.os === platform.os).map((asset) => (
                    <li key={asset.file} className={d.build}>
                      <a className={d.buildLink} href={desktopAssetUrl(asset.file)}>
                        <span className={d.buildArch}>{archName(asset)}</span>
                        <span className={d.buildKind}>{asset.kind}</span>
                      </a>
                      <a
                        className={d.checksum}
                        href={desktopAssetUrl(`${asset.file}.sha256`)}
                        aria-label={`SHA-256 checksum for ${asset.file}`}
                      >
                        SHA-256
                      </a>
                    </li>
                  ))}
                </ul>
                <p className={d.requirements}>{platform.requirements}</p>
                <p className={d.verify}>
                  Verify <code>{platform.verify}</code>
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
