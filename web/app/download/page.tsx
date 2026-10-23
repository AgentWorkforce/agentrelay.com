import type { Metadata } from 'next';

import { GitHubStarsBadge } from '../../components/GitHubStars';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { DESKTOP_ASSETS, desktopAssetUrl } from '../../lib/desktop-downloads';
import { absoluteUrl } from '../../lib/site';
import legal from '../legal.module.css';
import { DownloadButton } from './DownloadButton';
import s from './download.module.css';

const description =
  'Download the Agent Relay desktop app for macOS, Linux, or Windows. It connects the coding agents on your machine to your team’s relay.';

export const metadata: Metadata = {
  title: 'Download Agent Relay',
  description,
  alternates: { canonical: absoluteUrl('/download') },
  openGraph: { title: 'Download Agent Relay', description, url: absoluteUrl('/download') },
};

export default function DownloadPage() {
  return (
    <div className={legal.page}>
      <SiteNav actions={<GitHubStarsBadge />} />

      <main className={legal.content}>
        <h1 className={legal.title}>Download Agent Relay</h1>
        <p className={legal.subtitle}>
          The desktop app connects the coding agents on your machine to your team’s relay. Install it, sign in,
          and your agents can reach each other.
        </p>

        <DownloadButton />

        <section className={legal.section} aria-labelledby="agent-install">
          <h2 id="agent-install">Let your agent install it</h2>
          <p>
            On macOS or Linux, give your coding agent one prompt and it downloads, verifies, and installs the app,
            then signs you in and connects your workspace. You approve the sign-in; it does the rest.
          </p>
          <p>
            <a href="/signup/teams" className={legal.link}>
              Let your agent install it
            </a>
          </p>
        </section>

        <section className={legal.section} aria-labelledby="all-downloads">
          <h2 id="all-downloads">All downloads</h2>
          <p>Every build is the latest release. Each has a SHA-256 checksum to verify the file you downloaded.</p>
          <div className={legal.tableWrapper}>
            <table className={legal.table}>
              <thead>
                <tr>
                  <th scope="col">Platform</th>
                  <th scope="col">Format</th>
                  <th scope="col">Download</th>
                  <th scope="col">Checksum</th>
                </tr>
              </thead>
              <tbody>
                {DESKTOP_ASSETS.map((asset) => (
                  <tr key={asset.file}>
                    <td>{asset.label}</td>
                    <td>{asset.kind}</td>
                    <td>
                      <a href={desktopAssetUrl(asset.file)} className={`${legal.link} ${s.file}`}>
                        {asset.file}
                      </a>
                    </td>
                    <td>
                      <a href={desktopAssetUrl(`${asset.file}.sha256`)} className={legal.link}>
                        SHA-256
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Check a download with <code className={s.code}>shasum -a 256 -c &lt;file&gt;.sha256</code> on macOS,{' '}
            <code className={s.code}>sha256sum -c &lt;file&gt;.sha256</code> on Linux, run in the folder that
            holds both files, or compare the file’s{' '}
            <code className={s.code}>Get-FileHash</code> with the checksum on Windows.
          </p>
        </section>

        <section className={legal.section} aria-labelledby="requirements">
          <h2 id="requirements">Requirements</h2>
          <ul className={legal.list}>
            <li>
              <strong>macOS</strong> 13 Ventura or later, on Apple silicon or Intel.
            </li>
            <li>
              <strong>Linux</strong> with glibc 2.34 or later and GTK 4.6 or later, on x64 or ARM64. The
              background service runs under systemd.
            </li>
            <li>
              <strong>Windows</strong> on x64 or ARM64. Setup installs for your account only, without
              administrator rights; the background service runs as a logon task in Task Scheduler.
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
