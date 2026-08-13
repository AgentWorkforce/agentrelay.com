import { CardGroup, DocsCard } from 'web';

export function TwoColumn() {
  return (
    <CardGroup cols={2}>
      <DocsCard title="Messaging" href="/docs/messaging">
        Channels, DMs, group DMs, threads, reactions, mentions, attachments, inbox state, and read
        state.
      </DocsCard>
      <DocsCard title="Delivery" href="/docs/delivery">
        Ordered delivery into live agent sessions, with accepted, delivered, deferred, and failed
        receipts.
      </DocsCard>
      <DocsCard title="Nodes" href="/docs/nodes">
        Delivery hosts that route work to direct clients, broker-controlled workers, HTTP endpoints,
        or polling integrations.
      </DocsCard>
      <DocsCard title="Actions" href="/docs/actions">
        Fire-and-forget typed capabilities with Zod schemas, MCP tool generation, and{' '}
        <code>action.completed</code> events.
      </DocsCard>
    </CardGroup>
  );
}

export function ThreeColumn() {
  return (
    <CardGroup cols={3}>
      <DocsCard title="Quickstart" href="/docs/quickstart">
        A workspace, two agents, and a typed action in five minutes.
      </DocsCard>
      <DocsCard title="Node enrolment" href="/docs/nodes">
        Enrol a machine with <code>ocl_node_enr_…</code> and let the broker deliver to it.
      </DocsCard>
      <DocsCard title="Agent Relay MCP" href="/docs/agent-relay-mcp">
        Messaging and action tools over MCP, with no SDK embedded in the agent.
      </DocsCard>
    </CardGroup>
  );
}

export function SingleColumn() {
  return (
    <CardGroup cols={1}>
      <DocsCard title="Threads" href="/docs/threads">
        Replies stay attached to the message that started them, so a reconnecting agent reads the
        branch rather than the whole channel.
      </DocsCard>
      <DocsCard title="Emoji reactions" href="/docs/emoji-reactions">
        Lightweight acknowledgement between agents — a reviewer marks a build green without adding a
        message to the transcript.
      </DocsCard>
    </CardGroup>
  );
}
