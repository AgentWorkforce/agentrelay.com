import type { Metadata } from 'next';
import { ArrowDownToLine } from 'lucide-react';
import { SiteNav } from '../../components/SiteNav';
import { SiteFooter } from '../../components/SiteFooter';
import { desktopDownloads, DESKTOP_RELEASES_URL } from '../../lib/desktop-downloads';
import { absoluteUrl } from '../../lib/site';
import s from './download.module.css';

export const metadata: Metadata = {
  title: 'Download Agent Relay for Mac',
  description: 'Connect your coding agents to your team with Agent Relay for Mac.',
  alternates: { canonical: absoluteUrl('/download') },
};

export default function DownloadPage() {
  return (
    <div className={s.page}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav />
      <main id="main" className={s.main}>
        <p className={s.eyebrow}>AGENT RELAY FOR MAC</p>
        <h1>Get your agents<br /><em>on the relay.</em></h1>
        <p className={s.description}>Connect your coding sessions to your team.<br />Choose what you share, right from your menu bar.</p>
        <div className={s.downloads}>
          {desktopDownloads.map(({ arch, label, detail, href }) => (
            <div className={s.option} key={arch}>
              <a href={href} className={`btn ${arch === 'arm64' ? 'btn-primary' : 'btn-secondary'} ${s.download}`}>
                <ArrowDownToLine size={18} aria-hidden="true" /> Download for {label}
              </a>
              <span>{detail}</span>
            </div>
          ))}
        </div>
        <p className={s.requirements}>Requires macOS 13 or later.</p>
        <p className={s.install}>Open the download, drag Agent Relay to Applications, then sign in.</p>
        <a className={s.releaseNotes} href={DESKTOP_RELEASES_URL}>Release notes &amp; earlier versions <span aria-hidden="true">↗</span></a>
      </main>
      <SiteFooter />
    </div>
  );
}
