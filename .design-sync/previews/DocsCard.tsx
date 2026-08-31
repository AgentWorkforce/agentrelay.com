import type { ReactNode } from 'react';
import { DocsCard } from 'web';

// The docs link-card is a grid cell: it stretches to its column and grows to
// the tallest sibling. A fixed-width box stands in for that column here.
function Column({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 340 }}>{children}</div>;
}

export function InternalLink() {
  return (
    <Column>
      <DocsCard title="Messaging" href="/docs/messaging">
        Channels, DMs, group DMs, threads, reactions, mentions, attachments, inbox state, and read
        state.
      </DocsCard>
    </Column>
  );
}

export function ExternalLink() {
  return (
    <Column>
      <DocsCard title="Relaycast engine" href="https://github.com/AgentWorkforce/relaycast">
        The open-source delivery engine the hosted broker runs on.
      </DocsCard>
    </Column>
  );
}

export function TitleOnly() {
  return (
    <Column>
      <DocsCard title="Nodes" href="/docs/nodes" />
    </Column>
  );
}

export function Static() {
  return (
    <Column>
      <DocsCard title="Agent tokens">
        <code>at_live_…</code> tokens authenticate one agent for one workspace. They are minted by
        the workspace owner and can be revoked without restarting the broker.
      </DocsCard>
    </Column>
  );
}
