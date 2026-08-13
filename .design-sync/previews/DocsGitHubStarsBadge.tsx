import type { ReactNode } from 'react';
import { DocsGitHubStarsBadge, LogoIcon, LogoWordmark } from 'web';

/** The repo set the docs layout ships — one per documented product. */
const repos = [
  {
    id: null,
    repo: 'agentworkforce/relay',
    href: 'https://github.com/agentworkforce/relay',
    label: 'Agent Relay',
  },
  {
    id: 'file',
    repo: 'AgentWorkforce/relayfile',
    href: 'https://github.com/AgentWorkforce/relayfile',
    label: 'Relayfile',
  },
  {
    id: 'agents',
    repo: 'AgentWorkforce/agents',
    href: 'https://github.com/AgentWorkforce/agents',
    label: 'Agents',
  },
  {
    id: 'factory',
    repo: 'AgentWorkforce/factory',
    href: 'https://github.com/AgentWorkforce/factory',
    label: 'Factory',
  },
];

/**
 * The badge reads its count from the browser cache it writes after fetching
 * GitHub, so seeding that cache during render is what renders the loaded state
 * without a network round trip.
 */
function seed(pathname: string, repo: string, count: string) {
  (window as { __dsPathname?: string }).__dsPathname = pathname;
  window.localStorage.setItem(
    `agentrelay:github-stars:${repo}`,
    JSON.stringify({ count, expiresAt: Date.now() + 60 * 60 * 1000 })
  );
}

/** The docs header slot the badge ships in. */
function NavBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        width: 420,
        padding: '10px 24px',
        borderRadius: 14,
        border: '1px solid var(--nav-border)',
        background: 'var(--nav-solid-bg)',
        color: 'var(--nav-fg)',
        boxShadow: '0 8px 24px var(--nav-shadow)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LogoIcon />
        <LogoWordmark />
      </span>
      {children}
    </div>
  );
}

export function AgentRelayDocs() {
  seed('/docs/quickstart', 'agentworkforce/relay', '2.4k');
  return (
    <NavBar>
      <DocsGitHubStarsBadge repos={repos} />
    </NavBar>
  );
}

export function RelayfileDocs() {
  seed('/docs/file/mount-layout', 'AgentWorkforce/relayfile', '1.1k');
  return (
    <NavBar>
      <DocsGitHubStarsBadge repos={repos} />
    </NavBar>
  );
}

/** Under a thousand stars the count is printed exactly, with no `k` suffix. */
export function FactoryDocs() {
  seed('/docs/factory/quickstart', 'AgentWorkforce/factory', '312');
  return (
    <NavBar>
      <DocsGitHubStarsBadge repos={repos} />
    </NavBar>
  );
}
