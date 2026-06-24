import { productSections } from '../lib/product-docs-nav';
import { DocsGitHubStarsBadge, type DocsStarRepo } from './DocsGitHubStarsBadge';
import s from './github-stars.module.css';

type GitHubRepoResponse = {
  stargazers_count?: number;
};

const DEFAULT_REPO = 'agentworkforce/relay';

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function formatStarCount(stars: number): string {
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}

async function getGitHubStars(repo: string = DEFAULT_REPO): Promise<string | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'agentrelay-web',
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) return null;

    const data = (await response.json()) as GitHubRepoResponse;
    return typeof data.stargazers_count === 'number' ? formatStarCount(data.stargazers_count) : null;
  } catch {
    return null;
  }
}

/**
 * Docs header badge that follows the active section: Relayfile under
 * `/docs/file`, Relayloop under `/docs/loop`, Agent Relay elsewhere. Fetches
 * every section's star count on the server, then the client picks by path.
 */
export async function DocsGitHubStarsBadgeServer() {
  const targets: { id: string | null; repo: string; label: string }[] = [
    { id: null, repo: DEFAULT_REPO, label: 'Agent Relay' },
    ...productSections.map((section) => ({
      id: section.id,
      repo: section.repo,
      label: section.label,
    })),
  ];

  const counts = await Promise.all(targets.map((t) => getGitHubStars(t.repo)));
  const repos: DocsStarRepo[] = targets.map((t, i) => ({
    id: t.id,
    href: `https://github.com/${t.repo}`,
    label: t.label,
    count: counts[i],
  }));

  return <DocsGitHubStarsBadge repos={repos} />;
}

export async function GitHubStarsBadge() {
  const count = await getGitHubStars();

  return (
    <a
      href="https://github.com/agentworkforce/relay"
      target="_blank"
      rel="noopener noreferrer"
      className={s.badge}
      aria-label={count ? `View Agent Relay on GitHub (${count} stars)` : 'View Agent Relay on GitHub'}
    >
      <GithubIcon />
      {count ? (
        <span className={s.meta}>
          <span className={s.divider} />
          <span className={s.count}>{count}</span>
        </span>
      ) : null}
    </a>
  );
}
