import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { RELAY_DESKTOP_RELEASES_URL, desktopDownloads } from '../../lib/desktop-downloads';
import { DEFAULT_OG_ALT, DEFAULT_OG_IMAGE_PATH, defaultOgImage } from '../../lib/og-meta';
import { SITE_NAME, absoluteUrl } from '../../lib/site';
import home from '../landing.module.css';
import flows from '../flows/flows.module.css';
import { MacArchitectureHint } from './MacArchitectureHint';
import s from './download.module.css';

const TITLE = 'Download Agent Relay for Mac';
const DESCRIPTION =
  'Install the Agent Relay Mac app, sign in with Google, and your coding sessions show up in your team’s shared history.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl('/download') },
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
    images: [{ url: absoluteUrl(DEFAULT_OG_IMAGE_PATH), alt: DEFAULT_OG_ALT }],
  },
};

export default function DownloadPage() {
  const downloads = desktopDownloads();
  const navDownloadLink = (
    <a className={`${home.ctaPrimary} ${home.homeNavAction}`} href={downloads[0].href} rel="noopener">
      Download for Mac
    </a>
  );

  return (
    <div className={`${flows.page} ${s.page}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <SiteNav actions={navDownloadLink} mobileMenuContent={navDownloadLink} />

      <main id="main" className={flows.main}>
        <section className={flows.hero} aria-labelledby="download-heading">
          <div className={flows.heroCopy}>
            <p className={s.eyebrow}>Agent Relay for Mac</p>
            <h1 id="download-heading">
              <span className={flows.headlineLine}>Connect your Mac in two clicks</span>
            </h1>
            <p className={flows.heroLead}>
              The Mac app installs the Agent Relay probe and signs you in with Google — after that,
              your coding sessions from Claude Code, Codex, Cursor and more show up in your team’s
              shared history. It lives in the menu bar, shows upload progress, lets you pause uploads
              and choose which past sessions to share, and starts at login.
            </p>

            <MacArchitectureHint />

            <div className={s.downloadButtons}>
              {downloads.map((download, index) => (
                <a
                  key={download.id}
                  className={`${index === 0 ? flows.ctaPrimary : flows.ctaSecondary} ${s.downloadButton}`}
                  href={download.href}
                  rel="noopener"
                >
                  {download.label}
                  <span className={s.downloadButtonNote}>{download.note}</span>
                </a>
              ))}
            </div>

            <div className={s.notes}>
              <p>
                Not sure which Mac you have? Apple menu → About This Mac: “Apple M…” chips are Apple
                silicon.
              </p>
              <p>Windows: coming soon.</p>
            </div>

            <div className={`${flows.ctaRow} ${s.secondaryLinks}`}>
              <a
                className={flows.ctaSecondary}
                href={RELAY_DESKTOP_RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                All releases
              </a>
              <Link className={flows.ctaSecondary} href="/teams">
                About Agent Relay Teams
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
