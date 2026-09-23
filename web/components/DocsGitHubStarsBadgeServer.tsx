import { productSections } from '../lib/product-docs-nav';
import { DocsGitHubStarsBadge, type DocsStarRepo } from './DocsGitHubStarsBadge';
import { DEFAULT_REPO } from './GitHubStars';

/**
 * Docs header badge that follows the active section: Relayfile under
 * `/docs/file`, Relayloop under `/docs/loop`, Agent Relay elsewhere. The
 * client loads only the active repo's count, so the docs route stays static.
 *
 * Lives apart from GitHubStars.tsx so pages that only show the Agent Relay
 * badge don't pull this client component and the docs nav into their bundle.
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

  const repos: DocsStarRepo[] = targets.map((t) => ({
    id: t.id,
    repo: t.repo,
    href: `https://github.com/${t.repo}`,
    label: t.label,
  }));

  return <DocsGitHubStarsBadge repos={repos} />;
}
