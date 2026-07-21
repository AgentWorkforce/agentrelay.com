'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

import { getProductSectionForPath } from '../lib/product-docs-nav';
import s from './github-stars.module.css';

export type DocsStarRepo = {
  /** Product section id (`file`, `loop`) or `null` for the default Agent Relay repo. */
  id: string | null;
  repo: string;
  href: string;
  label: string;
};

type StarCacheEntry = { count: string; expiresAt: number };

const STAR_CACHE_PREFIX = 'agentrelay:github-stars:';
const STAR_CACHE_TTL_MS = 60 * 60 * 1000;

function formatStarCount(stars: number): string {
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}

function getCachedStarCount(repo: string): string | null {
  try {
    const cached = localStorage.getItem(`${STAR_CACHE_PREFIX}${repo}`);
    if (!cached) return null;

    const entry = JSON.parse(cached) as StarCacheEntry;
    return entry.expiresAt > Date.now() ? entry.count : null;
  } catch {
    return null;
  }
}

function cacheStarCount(repo: string, count: string) {
  try {
    localStorage.setItem(
      `${STAR_CACHE_PREFIX}${repo}`,
      JSON.stringify({ count, expiresAt: Date.now() + STAR_CACHE_TTL_MS } satisfies StarCacheEntry)
    );
  } catch {
    // Storage can be unavailable in private browsing; the badge still works.
  }
}

function GithubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * GitHub stars badge that targets the repo for the docs section currently being
 * viewed: Relayfile under `/docs/file`, Relayloop under `/docs/loop`, and Agent
 * Relay everywhere else. It loads the active repo's count directly from
 * GitHub and keeps it in browser storage for an hour, so docs rendering never
 * depends on a server-side refresh.
 */
export function DocsGitHubStarsBadge({ repos }: { repos: DocsStarRepo[] }) {
  const pathname = usePathname() ?? '/docs';
  const section = getProductSectionForPath(pathname);
  const entry =
    repos.find((r) => r.id === (section?.id ?? null)) ?? repos.find((r) => r.id === null) ?? repos[0];
  const [count, setCount] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;

    const cached = getCachedStarCount(entry.repo);
    if (cached) {
      setCount(cached);
      return;
    }

    const controller = new AbortController();
    void fetch(`https://api.github.com/repos/${entry.repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'force-cache',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = (await response.json()) as { stargazers_count?: number };
        return typeof data.stargazers_count === 'number' ? formatStarCount(data.stargazers_count) : null;
      })
      .then((nextCount) => {
        if (!nextCount) return;
        cacheStarCount(entry.repo, nextCount);
        setCount(nextCount);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [entry]);

  if (!entry) return null;

  return (
    <a
      href={entry.href}
      target="_blank"
      rel="noopener noreferrer"
      className={s.badge}
      aria-label={
        count
          ? `View ${entry.label} on GitHub (${count} stars)`
          : `View ${entry.label} on GitHub`
      }
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
