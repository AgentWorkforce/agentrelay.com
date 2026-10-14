import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Star } from 'lucide-react';

import { GitHubStarsBadge } from '../../components/GitHubStars';
import { GitHubIcon } from '../../components/home/icons';
import { SiteFooter } from '../../components/SiteFooter';
import { SiteNav } from '../../components/SiteNav';
import { DEFAULT_OG_IMAGE_PATH, ogImage } from '../../lib/og-meta';
import {
  fetchOrgRepoStats,
  formatStars,
  GITHUB_ORG,
  GITHUB_ORG_URL,
  OSS_CATEGORIES,
  type OssRepo,
  type RepoStats,
} from '../../lib/open-source';
import { absoluteUrl, SITE_NAME } from '../../lib/site';
import s from '../landing.module.css';
import o from './open-source.module.css';

const TITLE = 'Open Source';
const DESCRIPTION =
  'Agent Relay is built in the open. Browse the messaging engine, SDKs, filesystem, auth, flows, and agent tooling behind the platform.';

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

function RepoCard({ repo, stats }: { repo: OssRepo; stats?: RepoStats }) {
  const githubUrl = `${GITHUB_ORG_URL}/${repo.repo}`;
  const language = stats?.language;

  return (
    <article className={o.card}>
      <div className={o.cardHeader}>
        <h3 className={o.cardTitle}>
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" className={o.cardLink}>
            {repo.name}
          </a>
        </h3>
        {stats && stats.stars > 0 ? (
          <span className={o.stars} aria-label={`${stats.stars} GitHub stars`}>
            <Star aria-hidden="true" />
            {formatStars(stats.stars)}
          </span>
        ) : null}
      </div>
      <p className={o.cardPath}>
        {GITHUB_ORG.toLowerCase()}/{repo.repo}
      </p>
      <p className={o.cardDescription}>{repo.description}</p>
      <div className={o.cardFooter}>
        {language ? (
          <span className={o.language}>
            <span
              className={o.languageDot}
              style={{ background: LANGUAGE_COLORS[language] ?? 'var(--fg-faint)' }}
              aria-hidden="true"
            />
            {language}
          </span>
        ) : (
          <span />
        )}
        {repo.href ? (
          <Link href={repo.href} className={o.cardMore}>
            Learn more
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export default async function OpenSourcePage() {
  const stats = await fetchOrgRepoStats();
  const listedRepos = OSS_CATEGORIES.flatMap((category) => category.repos);
  const totalStars = listedRepos.reduce((sum, repo) => sum + (stats.get(repo.repo.toLowerCase())?.stars ?? 0), 0);

  return (
    <div className={`${s.page} ${s.messagingPage}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteNav actions={<GitHubStarsBadge />} />

      <main id="main">
        <div className={s.heroSection}>
          <section className={s.heroCenter}>
            <div className={s.heroCenterColumn}>
              <p className={o.eyebrow}>Open source</p>
              <h1 className={`${s.headline} ${s.heroCenterHeadline}`}>Built in the open</h1>
              <p className={`${s.subtitle} ${s.heroCenterSubtitle}`}>
                The messaging engine, SDKs, filesystem, and agent tooling behind Agent Relay are open source. Read
                the code, run it yourself, and help shape where it goes next.
              </p>
              <div className={s.heroCenterCtas}>
                <a className={s.ctaPrimary} href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer">
                  <GitHubIcon />
                  Browse on GitHub
                </a>
                <a
                  className={s.ctaSecondary}
                  href="https://github.com/AgentWorkforce/relay/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Find an issue
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>
              <dl className={o.statRow}>
                <div className={o.stat}>
                  <dt>Projects</dt>
                  <dd>{listedRepos.length}</dd>
                </div>
                {totalStars > 0 ? (
                  <div className={o.stat}>
                    <dt>GitHub stars</dt>
                    <dd>{formatStars(totalStars)}</dd>
                  </div>
                ) : null}
                <div className={o.stat}>
                  <dt>SDK languages</dt>
                  <dd>4</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <nav className={o.categoryNav} aria-label="Project categories">
          <div className={o.categoryNavInner}>
            {OSS_CATEGORIES.map((category) => (
              <a key={category.id} href={`#${category.id}`} className={o.categoryChip}>
                {category.title}
                <span className={o.categoryCount}>{category.repos.length}</span>
              </a>
            ))}
          </div>
        </nav>

        <div className={o.body}>
          {OSS_CATEGORIES.map((category) => (
            <section key={category.id} id={category.id} className={o.category} aria-labelledby={`${category.id}-title`}>
              <header className={o.categoryHeader}>
                <h2 id={`${category.id}-title`} className={o.categoryTitle}>
                  {category.title}
                </h2>
                <p className={o.categoryDescription}>{category.description}</p>
              </header>
              <div className={o.grid}>
                {category.repos.map((repo) => (
                  <RepoCard key={repo.repo} repo={repo} stats={stats.get(repo.repo.toLowerCase())} />
                ))}
              </div>
            </section>
          ))}

          <section className={o.closing}>
            <h2 className={o.closingTitle}>Build with us</h2>
            <p className={o.closingBody}>
              Issues, pull requests, and ideas are welcome on every repo. Join the Discord to talk with the team and
              other builders running agent teams.
            </p>
            <div className={o.closingCtas}>
              <a className={s.ctaPrimary} href="https://discord.gg/RJGE7CHV" target="_blank" rel="noopener noreferrer">
                Join the Discord
                <ArrowUpRight aria-hidden="true" />
              </a>
              <Link className={s.ctaSecondary} href="/docs">
                Read the docs
                <ArrowRight aria-hidden="true" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
