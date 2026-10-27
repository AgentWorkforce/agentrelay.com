export const GITHUB_ORG = 'AgentWorkforce';
export const GITHUB_ORG_URL = `https://github.com/${GITHUB_ORG}`;

export type OssRepo = {
  /** Repository name under the AgentWorkforce org. */
  repo: string;
  name: string;
  description: string;
  /** Site page or docs for the project, when it has one. */
  href?: string;
};

export type OssCategory = {
  id: string;
  title: string;
  description: string;
  repos: OssRepo[];
};

export const OSS_CATEGORIES: OssCategory[] = [
  {
    id: 'core',
    title: 'Core platform',
    description: 'Messaging, files, auth, scheduling, and flows. The layers every workspace runs on.',
    repos: [
      {
        repo: 'relay',
        name: 'Agent Relay',
        description: 'The CLI and TypeScript, Python, and Swift SDKs that let coding agents message each other.',
        href: '/docs',
      },
      {
        repo: 'relaycast',
        name: 'Relaycast',
        description: 'The messaging engine: channels, threads, DMs, and durable delivery for agents.',
        href: '/docs/relaycast-api',
      },
      {
        repo: 'relayfile',
        name: 'Relayfile',
        description: 'A virtual filesystem over REST that turns webhooks into files and writes edits back.',
        href: '/file',
      },
      {
        repo: 'relayauth',
        name: 'Relayauth',
        description: 'Scoped permissions so an agent can do exactly what it should, and nothing else.',
      },
      {
        repo: 'relaycron',
        name: 'Relaycron',
        description: 'Scheduled work for agents, delivered over webhooks or websockets.',
      },
      {
        repo: 'flows',
        name: 'Flows',
        description: 'Script multi-step, multi-agent runs that are predictable and auditable.',
        href: '/flows',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools & apps',
    description: 'Desktop apps and standalone tools for understanding and improving agent work.',
    repos: [
      {
        repo: 'pear',
        name: 'Pear',
        description: 'A desktop app for pair programming with a team of agents.',
        href: '/pear',
      },
      {
        repo: 'trajectories',
        name: 'Trajectories',
        description: 'Records the reasoning behind agent work as structured, searchable history.',
      },
      {
        repo: 'relayhistory',
        name: 'Relayhistory',
        description: 'Syncs Claude Code and Codex conversation history into SQLite for search.',
      },
      {
        repo: 'burn',
        name: 'Burn',
        description: 'A ledger of the tokens your coding agents spend.',
      },
      {
        repo: 'limit',
        name: 'Limit',
        description: 'A terminal dashboard for agent usage limits.',
      },
      {
        repo: 'rust-oleum',
        name: 'Rust-Oleum',
        description: 'A code-quality ratchet for Rust codebases.',
      },
      {
        repo: 'sandbox',
        name: 'Sandbox',
        description: 'Provider-agnostic sandbox runtimes for agent workloads.',
      },
      {
        repo: 'collab-bench',
        name: 'Collab Bench',
        description: 'A benchmark for how well agents work together.',
      },
    ],
  },
  {
    id: 'agents',
    title: 'Agents & skills',
    description: 'Prebuilt agents and skills to drop into any workspace.',
    repos: [
      {
        repo: 'agents',
        name: 'Agents',
        description: 'Prebuilt agents for review, repo hygiene, Linear, meeting notes, and more.',
        href: '/agents',
      },
      {
        repo: 'skills',
        name: 'Skills',
        description: 'Skills and commands for running Agent Relay teams from Claude Code and Codex.',
      },
      {
        repo: 'workforce',
        name: 'Workforce',
        description: 'Single-purpose agent configs, versioned and shared like code.',
      },
      {
        repo: 'software-garden',
        name: 'Software Garden',
        description: 'Turns ready issues into reviewed pull requests within a scope you define.',
      },
      {
        repo: 'ricky',
        name: 'Ricky',
        description: 'Monitors long-running workflows, diagnoses failures, and resumes them.',
      },
      {
        repo: 'proactive',
        name: 'Proactive',
        description: 'Tools for agents that act on events instead of waiting for a prompt.',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & protocols',
    description: 'Bridges, adapters, and open specs for the rest of your stack.',
    repos: [
      {
        repo: 'c2a',
        name: 'C2A Protocol',
        description: 'The Chat-to-Agents protocol: when an agent should reply, and when it should stay quiet.',
      },
      {
        repo: 'agent-tool-spec',
        name: 'Agent Tool Spec',
        description: 'An open spec for testing whether an agent picks and calls your tools correctly.',
      },
      {
        repo: 'relayfile-adapters',
        name: 'Relayfile Adapters',
        description: 'Maps SaaS APIs into the Relayfile filesystem.',
      },
      {
        repo: 'relayfile-providers',
        name: 'Relayfile Providers',
        description: 'Auth and credentials for the services Relayfile connects to.',
      },
      {
        repo: 'agent-relay-openclaw',
        name: 'OpenClaw Bridge',
        description: 'Channels, threads, and DMs for OpenClaw agents.',
        href: '/openclaw',
      },
      {
        repo: 'agent-relay-acp-bridge',
        name: 'ACP Bridge',
        description: 'Connects Agent Client Protocol agents to Agent Relay.',
      },
      {
        repo: 'herdr-relay-bridge',
        name: 'Herdr Bridge',
        description: 'Runs Herdr agents as a coordinated fleet.',
      },
      {
        repo: 'n8n-nodes-relayfile',
        name: 'n8n Nodes',
        description: 'Relayfile nodes for n8n workflows.',
      },
      {
        repo: 'helm-charts',
        name: 'Helm Charts',
        description: 'Kubernetes charts for Relayfile and Flows.',
      },
    ],
  },
  {
    id: 'examples',
    title: 'Examples & demos',
    description: 'Cookbooks and demos, most of them built by agents over the relay.',
    repos: [
      {
        repo: 'flows-cookbook',
        name: 'Flows Cookbook',
        description: 'Reusable flows for everyday engineering work.',
      },
      {
        repo: 'swarm-patterns',
        name: 'Swarm Patterns',
        description: 'Interactive visualizations of multi-agent orchestration patterns.',
      },
      {
        repo: 'relay-cross-framework-demo',
        name: 'Cross-framework Demo',
        description: 'A LangGraph agent and a CrewAI agent talking in real time.',
      },
      {
        repo: 'software-garden-demo',
        name: 'Software Garden Demo',
        description: 'A tiny garden simulator, tended by agents.',
      },
      {
        repo: 'relay-visualizer',
        name: 'Relay Visualizer',
        description: 'An interactive map of how Agent Relay works.',
      },
      {
        repo: 'tic-tac-toe',
        name: 'Tic-Tac-Toe',
        description: 'A CLI game built by a relay-coordinated agent swarm. The first proof point.',
      },
    ],
  },
];

export type RepoStats = {
  stars: number;
  language: string | null;
};

type GitHubOrgRepo = {
  name: string;
  stargazers_count: number;
  language: string | null;
};

/**
 * Star and language counts for every public repo in the org, keyed by
 * lowercased repo name. Seeds the server render; the page refreshes stars
 * live in the browser. An empty record means GitHub was unreachable.
 */
export async function fetchOrgRepoStats(): Promise<Record<string, RepoStats>> {
  const stats: Record<string, RepoStats> = {};
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'agentrelay-web',
        },
        next: { revalidate: 300 },
      },
    );
    if (!response.ok) return stats;

    const repos = (await response.json()) as GitHubOrgRepo[];
    for (const repo of repos) {
      stats[repo.name.toLowerCase()] = { stars: repo.stargazers_count, language: repo.language };
    }
  } catch {
    // Render without stats.
  }
  return stats;
}

/** Exact below 10k, so live changes stay visible: 1,012 · 12.4k. */
export function formatStars(stars: number): string {
  return stars >= 10_000 ? `${(stars / 1000).toFixed(1)}k` : stars.toLocaleString('en-US');
}
