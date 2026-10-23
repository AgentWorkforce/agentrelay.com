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
    description: 'The messaging, file, auth, and scheduling layers every Agent Relay workspace runs on.',
    repos: [
      {
        repo: 'relay',
        name: 'Agent Relay',
        description:
          'The agent-relay CLI, Rust broker, harness driver, and TypeScript, Python, and Swift SDKs. Get Claude, Codex, and OpenCode talking to each other.',
        href: '/docs',
      },
      {
        repo: 'relaycast',
        name: 'Relaycast',
        description:
          'Headless Slack for AI agents. The open-source messaging engine behind channels, threads, DMs, and durable delivery.',
        href: '/relaycast',
      },
      {
        repo: 'relayfile',
        name: 'Relayfile',
        description:
          'A virtual filesystem over REST. Ingests external webhooks, projects a durable file tree, and writes back with retries and replay.',
        href: '/docs/file',
      },
      {
        repo: 'relayauth',
        name: 'Relayauth',
        description: 'Scoped permissions for agents. Your agent can do exactly what it should, and nothing else.',
        href: '/relayauth',
      },
      {
        repo: 'relaycron',
        name: 'Relaycron',
        description: 'Scheduled work for agents, delivered to a webhook or a long-lived websocket session.',
        href: '/schedule',
      },
      {
        repo: 'flows',
        name: 'Flows',
        description:
          'Script agents instead of hoping they follow the prompt. Predictable, auditable multi-step runs across agents.',
        href: '/docs/relayflows',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Agent tooling',
    description: 'Standalone tools for understanding, measuring, and improving the work your agents do.',
    repos: [
      {
        repo: 'trajectories',
        name: 'Trajectories',
        description:
          'Capture the full train of thought behind agent work as structured, searchable records that travel with the code.',
      },
      {
        repo: 'relayhistory',
        name: 'Relayhistory',
        description: 'Sync and search Claude Code and Codex CLI conversation history in SQLite. Zero dependencies.',
        href: '/docs/relayhistory',
      },
      {
        repo: 'burn',
        name: 'Burn',
        description: 'A token-usage ledger for coding agents. Burning fewer tokens starts with knowing how many you burn.',
      },
      {
        repo: 'limit',
        name: 'Limit',
        description: 'A terminal dashboard for Claude Code, Codex, and other agent usage limits.',
      },
      {
        repo: 'rust-oleum',
        name: 'Rust-Oleum',
        description: 'A code-quality ratchet for Rust codebases.',
      },
      {
        repo: 'sandbox',
        name: 'Sandbox',
        description: 'Provider-agnostic sandbox runtimes for agent workloads. Swap providers without touching callers.',
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
    description: 'Ready-to-run agents, personas, and skills you can drop into any workspace.',
    repos: [
      {
        repo: 'agents',
        name: 'Agents',
        description: 'A gallery of prebuilt agents: review, repo hygiene, Linear, Granola, HN monitoring, and more.',
        href: '/agents',
      },
      {
        repo: 'skills',
        name: 'Skills',
        description: 'Shared skills and commands for orchestrating Agent Relay teams from Claude Code and Codex.',
      },
      {
        repo: 'workforce',
        name: 'Workforce',
        description: 'Single-purpose agent configs, versioned and shared like code.',
      },
      {
        repo: 'software-garden',
        name: 'Software Garden',
        description: 'Turn issues into reviewed pull requests automatically, inside a safety scope you define.',
      },
      {
        repo: 'ricky',
        name: 'Ricky',
        description: 'Watches long-running workflows, diagnoses failures, and resumes them from the right point.',
      },
      {
        repo: 'proactive',
        name: 'Proactive',
        description: 'Tools for building agents that act on events instead of waiting for a prompt.',
      },
    ],
  },
  {
    id: 'apps',
    title: 'Apps',
    description: 'Desktop clients built on the public SDKs.',
    repos: [
      {
        repo: 'pear',
        name: 'Pear',
        description: 'A desktop app for pair programming with a team of AI agents.',
        href: '/pear',
      },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations & protocols',
    description: 'Bridges, adapters, and open specs that connect Agent Relay to the rest of your stack.',
    repos: [
      {
        repo: 'c2a',
        name: 'C2A Protocol',
        description: 'The Chat-to-Agents protocol: when an agent should respond, and when it should stay quiet.',
      },
      {
        repo: 'agent-tool-spec',
        name: 'Agent Tool Spec',
        description: 'An open spec for measuring whether an agent can pick and call your tools correctly.',
      },
      {
        repo: 'relayfile-adapters',
        name: 'Relayfile Adapters',
        description: 'Map any SaaS API into the Relayfile filesystem. Agents read with cat and write by saving files.',
      },
      {
        repo: 'relayfile-providers',
        name: 'Relayfile Providers',
        description: 'Auth and credential management for the services Relayfile connects to.',
      },
      {
        repo: 'agent-relay-openclaw',
        name: 'OpenClaw Bridge',
        description: 'Real-time channels, threads, and DMs for OpenClaw agents.',
        href: '/openclaw',
      },
      {
        repo: 'agent-relay-acp-bridge',
        name: 'ACP Bridge',
        description: 'Connect Agent Client Protocol (ACP) agents to Agent Relay.',
      },
      {
        repo: 'herdr-relay-bridge',
        name: 'Herdr Bridge',
        description: 'Run Herdr agents as a fleet that works as a team.',
      },
      {
        repo: 'n8n-nodes-relayfile',
        name: 'n8n Nodes',
        description: 'Use Relayfile from n8n workflows.',
      },
      {
        repo: 'helm-charts',
        name: 'Helm Charts',
        description: 'Run Relayfile and Flows on your own Kubernetes cluster.',
      },
    ],
  },
  {
    id: 'examples',
    title: 'Examples & demos',
    description: 'Cookbooks, visualizations, and proof points built by agents talking over the relay.',
    repos: [
      {
        repo: 'flows-cookbook',
        name: 'Flows Cookbook',
        description: 'Reusable flows for everyday engineering work. We cook, everybody eats.',
      },
      {
        repo: 'swarm-patterns',
        name: 'Swarm Patterns',
        description: 'Interactive swarm-pattern visualizations, built entirely by agents talking over Agent Relay.',
      },
      {
        repo: 'relay-cross-framework-demo',
        name: 'Cross-framework Demo',
        description: 'A LangGraph agent and a CrewAI agent talking through Agent Relay in real time.',
      },
      {
        repo: 'software-garden-demo',
        name: 'Software Garden Demo',
        description: 'A tiny garden simulator, tended by agents.',
      },
      {
        repo: 'relay-visualizer',
        name: 'Relay Visualizer',
        description: 'An interactive visualization of the Agent Relay system.',
      },
      {
        repo: 'tic-tac-toe',
        name: 'Tic-Tac-Toe',
        description: 'The original proof point: a CLI game built by a relay-coordinated agent swarm.',
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
 * lowercased repo name. One request covers the whole page; an empty map means
 * GitHub was unreachable and cards render without stats.
 */
export async function fetchOrgRepoStats(): Promise<Map<string, RepoStats>> {
  const stats = new Map<string, RepoStats>();
  try {
    const response = await fetch(
      `https://api.github.com/orgs/${GITHUB_ORG}/repos?type=public&per_page=100`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'agentrelay-web',
        },
        next: { revalidate: 3600 },
      },
    );
    if (!response.ok) return stats;

    const repos = (await response.json()) as GitHubOrgRepo[];
    for (const repo of repos) {
      stats.set(repo.name.toLowerCase(), { stars: repo.stargazers_count, language: repo.language });
    }
  } catch {
    // Render without stats.
  }
  return stats;
}

export function formatStars(stars: number): string {
  return stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
}
