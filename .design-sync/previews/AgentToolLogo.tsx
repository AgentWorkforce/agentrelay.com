import { AgentToolLogo } from 'web';

// Sizing and colour both come from the class the caller passes — these are the
// four the site itself uses: 11px in the realtime event feed, 14px in the
// delivery timeline, 36px in the "works with every agent" row, 2.8rem in the
// install visual.
const HARNESSES: { provider: string; label: string }[] = [
  { provider: 'claude', label: 'Claude' },
  { provider: 'codex', label: 'Codex' },
  { provider: 'opencode', label: 'OpenCode' },
  { provider: 'gemini', label: 'Gemini' },
  { provider: 'copilot', label: 'Copilot' },
];

export function AllHarnesses() {
  return (
    <div className="landing_byohLogos">
      {HARNESSES.map((harness) => (
        <div key={harness.provider} className="landing_logoCard">
          <AgentToolLogo
            className="landing_byohLogo"
            idPrefix={`byoh-agent-${harness.provider}`}
            provider={harness.provider}
          />
          <span className="landing_logoLabel">{harness.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Sizes() {
  const sizes = [
    { className: 'landing_realtimeHarnessLogo', label: '11px · event feed' },
    { className: 'landing_durableAgentIcon', label: '14px · timeline' },
    { className: 'landing_byohLogo', label: '36px · logo row' },
    { className: 'landing_installAgentLogoIcon', label: '2.8rem · install' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'flex-end',
        padding: 28,
        borderRadius: 16,
        background: 'var(--section-bg)',
      }}
    >
      {sizes.map((size) => (
        <div
          key={size.className}
          style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--surface)',
            }}
          >
            <AgentToolLogo className={size.className} provider="claude" />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
            {size.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function InAgentRoster() {
  const roster = [
    { provider: 'claude', name: 'Planner', model: 'Opus 5', status: 'Reviewing plan for AR-341' },
    { provider: 'codex', name: 'Builder', model: 'gpt-5.5', status: 'Writing the webhook parser' },
    { provider: 'opencode', name: 'Reviewer', model: 'deepseek-v4', status: 'Waiting on CI' },
  ];

  return (
    <div style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
      {roster.map((agent) => (
        <div
          key={agent.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid var(--line)',
            background: 'var(--card-bg)',
          }}
        >
          <AgentToolLogo
            className="landing_byohLogo"
            idPrefix={`roster-${agent.name}`}
            provider={agent.provider}
          />
          <span style={{ display: 'grid', gap: 2 }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {agent.name}
              <span style={{ color: 'var(--fg-muted)', fontWeight: 400 }}> · {agent.model}</span>
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>{agent.status}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function InDeliveryTimeline() {
  const nodes = [
    { provider: 'claude', agent: 'Planner', status: 'online' },
    { provider: 'codex', agent: 'Builder', status: 'online' },
    { provider: 'opencode', agent: 'Reviewer', status: 'offline' },
  ];

  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 320 }}>
      {nodes.map((node) => (
        <div
          key={node.agent}
          className={`landing_durableAgentCard ${
            node.status === 'online' ? 'landing_durableAgentOnline' : 'landing_durableAgentOffline'
          }`}
        >
          <AgentToolLogo
            className="landing_durableAgentIcon"
            idPrefix={`timeline-${node.agent}`}
            provider={node.provider}
          />
          <strong>{node.agent}</strong>
          <span className="landing_durableStatus">
            <span />
            {node.status}
          </span>
        </div>
      ))}
    </div>
  );
}
