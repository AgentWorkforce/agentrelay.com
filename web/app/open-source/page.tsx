import type { Metadata } from 'next';
import Link from 'next/link';

import { WaveDivider } from '../../components/home/icons';
import sections from '../../components/home/home-sections.module.css';
import { LiveGitHubBadge, LiveStarsProvider, StarCount, TotalStars } from '../../components/open-source/LiveStars';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { DEFAULT_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import { fetchOrgRepoStats, GITHUB_ORG, GITHUB_ORG_URL, OSS_CATEGORIES, type OssRepo } from '../../lib/open-source';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import s from '../landing.module.css';
import o from './open-source.module.css';

const TITLE = 'Open Source';
const DESCRIPTION = 'The code behind Agent Relay: messaging, SDKs, files, flows, and agent tooling.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: absoluteUrl('/open-source'),
  },
  openGraph: {
    siteName: SITE_NAME,
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    url: absoluteUrl('/open-source'),
    type: 'website',
    images: [ogImage(DEFAULT_OG_IMAGE_PATH, `${TITLE} | ${SITE_NAME}`)],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE_NAME}`,
    description: DESCRIPTION,
    images: [absoluteUrl(DEFAULT_OG_IMAGE_PATH)],
  },
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Rust: '#dea584',
  Go: '#00add8',
  Python: '#3572a5',
  Swift: '#f05138',
};

function Repo({ repo, language }: { repo: OssRepo; language: string | null | undefined }) {
  return (
    <li className={o.repo}>
      <div className={o.repoHead}>
        <h3 className={o.repoName}>
          <a href={`${GITHUB_ORG_URL}/${repo.repo}`} target="_blank" rel="noopener noreferrer" className={o.repoLink}>
            {repo.name}
          </a>
        </h3>
        <StarCount repo={repo.repo} className={o.stars} />
      </div>
      <p className={o.repoDescription}>{repo.description}</p>
      <div className={o.repoMeta}>
        <span className={o.repoPath}>
          {language ? (
            <span
              className={o.languageDot}
              style={{ background: LANGUAGE_COLORS[language] ?? 'var(--fg-faint)' }}
              title={language}
            />
          ) : null}
          {GITHUB_ORG.toLowerCase()}/{repo.repo}
        </span>
        {repo.href ? (
          <Link href={repo.href} className={o.repoDocs}>
            Docs
          </Link>
        ) : null}
      </div>
    </li>
  );
}

export default async function OpenSourcePage() {
  const stats = await fetchOrgRepoStats();
  const listed = OSS_CATEGORIES.flatMap((category) => category.repos.map((repo) => repo.repo));

  return (
    <LiveStarsProvider initial={stats}>
      <div className={`${s.page} ${s.messagingPage} ${s.homeLanding}`}>
        <a className="skip-link" href="#main">
          Skip to content
        </a>

        <SiteNav actions={<LiveGitHubBadge />} />

        <main id="main">
          <header className={o.hero}>
            <h1 className={o.heroTitle}>Open source</h1>
            <p className={o.heroLine}>The code behind Agent Relay. Read it, run it, and send us a pull request.</p>
            <p className={o.heroMeta}>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className={o.heroOrg}>
                github.com/{GITHUB_ORG}
              </a>
              <span aria-hidden="true" className={o.heroOrgSep}>
                ·
              </span>
              <span>{listed.length} projects</span>
              <TotalStars repos={listed} />
            </p>
          </header>

          <div className={sections.waveBreak}>
            <WaveDivider />
          </div>

          <div className={o.catalog}>
            {OSS_CATEGORIES.map((category) => (
              <section
                key={category.id}
                id={category.id}
                className={o.category}
                aria-labelledby={`${category.id}-title`}
              >
                <div className={o.categoryHeader}>
                  <h2 id={`${category.id}-title`} className={o.categoryTitle}>
                    {category.title}
                  </h2>
                  <p className={o.categoryDescription}>{category.description}</p>
                </div>
                <ul className={o.repos}>
                  {category.repos.map((repo) => (
                    <Repo key={repo.repo} repo={repo} language={stats[repo.repo.toLowerCase()]?.language} />
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className={`${sections.band} ${sections.bandNight}`}>
            <section className={o.closing} aria-labelledby="contribute-title">
              <h2 id="contribute-title" className={sections.title}>
                Contribute
              </h2>
              <p className={sections.line}>Issues and pull requests are welcome on every repo.</p>
              <div className={sections.actions}>
                <a className={s.ctaPrimary} href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer">
                  Browse on GitHub
                </a>
                <a
                  className={s.ctaSecondary}
                  href="https://discord.gg/RJGE7CHV"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join the Discord
                </a>
              </div>
            </section>
          </div>
        </main>

        <SiteFooter />
      </div>
    </LiveStarsProvider>
  );
}
