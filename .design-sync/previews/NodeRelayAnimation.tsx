import { NodeRelayAnimation } from 'web';

// The spawn graph: Lead (Claude Opus) starts alone and spawns Planner, Coder,
// Reviewer, Frontend, Backend, Marketer and Tester across a scripted sequence,
// after which the eight cards relay work between themselves along the drawn
// connections.
//
// A static capture only ever shows one frame of that — usually the opening one,
// with Lead alone. See .design-sync/learnings/brand.md.
export function Default() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 10,
        width: 500,
        padding: 20,
        borderRadius: 18,
        background: 'var(--section-bg)',
      }}
    >
      <div style={{ height: 430 }}>
        <NodeRelayAnimation />
      </div>
      <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
        Opening frame — Lead alone. Seven more agents spawn into the ring as the script runs.
      </p>
    </div>
  );
}

export function InFramedPanel() {
  return (
    <div
      style={{
        width: 520,
        height: 430,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--line)',
        background: 'var(--surface)',
      }}
    >
      <NodeRelayAnimation />
    </div>
  );
}

export function OnHeroGradient() {
  return (
    <div
      style={{
        width: 520,
        height: 430,
        borderRadius: 16,
        overflow: 'hidden',
        background: 'var(--hero-gradient)',
      }}
    >
      <NodeRelayAnimation />
    </div>
  );
}
