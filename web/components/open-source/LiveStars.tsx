'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { formatStars, GITHUB_ORG, type RepoStats } from '../../lib/open-source';
import badge from '../github-stars.module.css';

type StatsByRepo = Record<string, RepoStats>;

const REFRESH_MS = 60_000;

const StarsContext = createContext<StatsByRepo>({});

/**
 * Holds the org's star counts: seeded from the server render, then refreshed
 * from GitHub every minute while the tab is visible. Requests use `no-cache`
 * so the browser revalidates with its ETag; GitHub does not count 304s
 * against the unauthenticated rate limit.
 */
export function LiveStarsProvider({ initial, children }: { initial: StatsByRepo; children: ReactNode }) {
  const [stats, setStats] = useState(initial);

  useEffect(() => {
    let stopped = false;

    async function refresh() {
      if (document.visibilityState !== 'visible') return;
      try {
        const response = await fetch(`https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`, {
          headers: { Accept: 'application/vnd.github+json' },
          cache: 'no-cache',
        });
        if (response.status === 403 || response.status === 429) {
          stopped = true;
          return;
        }
        if (!response.ok) return;
        const repos = (await response.json()) as { name: string; stargazers_count: number; language: string | null }[];
        const next: StatsByRepo = {};
        for (const repo of repos) {
          next[repo.name.toLowerCase()] = { stars: repo.stargazers_count, language: repo.language };
        }
        setStats(next);
      } catch {
        // Keep the last known counts.
      }
    }

    void refresh();
    const timer = window.setInterval(() => {
      if (!stopped) void refresh();
    }, REFRESH_MS);
    const onVisible = () => {
      if (!stopped && document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <StarsContext.Provider value={stats}>{children}</StarsContext.Provider>;
}

export function useRepoStats(repo: string): RepoStats | undefined {
  return useContext(StarsContext)[repo.toLowerCase()];
}

/** A repo's live star count, or nothing until it has one. */
export function StarCount({ repo, className }: { repo: string; className?: string }) {
  const stars = useRepoStats(repo)?.stars;
  if (!stars) return null;
  return (
    <span className={className} aria-label={`${stars} GitHub stars`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.3l-3.8 2 .7-4.3-3.1-3 4.3-.6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
      {formatStars(stars)}
    </span>
  );
}

/** "· N stars" summed live across the given repos, or nothing without counts. */
export function TotalStars({ repos }: { repos: string[] }) {
  const stats = useContext(StarsContext);
  const total = repos.reduce((sum, repo) => sum + (stats[repo.toLowerCase()]?.stars ?? 0), 0);
  if (total === 0) return null;
  return (
    <>
      <span aria-hidden="true">·</span>
      <span>{formatStars(total)} stars</span>
    </>
  );
}

/** The nav's GitHub badge for the relay repo, fed by the same live counts. */
export function LiveGitHubBadge() {
  const stars = useRepoStats('relay')?.stars;
  return (
    <a
      href={`https://github.com/${GITHUB_ORG}/relay`}
      target="_blank"
      rel="noopener noreferrer"
      className={badge.badge}
      aria-label={stars ? `View Agent Relay on GitHub (${stars} stars)` : 'View Agent Relay on GitHub'}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
      {stars ? (
        <span className={badge.meta}>
          <span className={badge.divider} />
          <span className={badge.count}>{formatStars(stars)}</span>
        </span>
      ) : null}
    </a>
  );
}
