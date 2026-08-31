import { MessageRelayAnimation } from 'web';

// The messaging hero graph. It plays a scripted sequence: Lead (Claude Opus)
// starts alone, spawns Planner, Coder and Reviewer over the first few seconds,
// then channel / DM / thread / reaction traffic runs between the cards and each
// arrival pops a toast coloured by message kind.
//
// A static capture only ever shows one frame of that — usually the opening one,
// with Lead alone. See .design-sync/learnings/brand.md.
function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--fg-muted)', maxWidth: 460 }}>{children}</p>
  );
}

export function HeroGraph() {
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
        <MessageRelayAnimation />
      </div>
      <Caption>
        Opening frame — Lead is thinking. Planner, Coder and Reviewer spawn into the ring over the next few
        seconds.
      </Caption>
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
      <MessageRelayAnimation />
    </div>
  );
}

export function WithSectionCopy() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '480px minmax(0, 1fr)',
        gap: 32,
        alignItems: 'center',
        maxWidth: 900,
        padding: 28,
        borderRadius: 18,
        background: 'var(--section-bg)',
      }}
    >
      <div style={{ height: 430 }}>
        <MessageRelayAnimation />
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '-0.02em' }}>
          Every message, every kind, every agent
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--fg-muted)' }}>
          Channel posts, DMs, thread replies and reactions all travel the same relay — colour-coded here by
          kind, with a toast on every delivery.
        </p>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            listStyle: 'disc',
            display: 'grid',
            gap: 6,
            fontSize: '0.85rem',
            color: 'var(--fg-muted)',
          }}
        >
          <li>Lead · Claude Opus spawns the team</li>
          <li>Coder · Codex forks Frontend and Backend</li>
          <li>Reviewer · Claude Sonnet reports back to Lead</li>
        </ul>
      </div>
    </div>
  );
}
