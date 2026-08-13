import type { ReactNode } from 'react';
import { BannerLink } from 'web';

// The banner sits at the end of a docs article and spans the content column.
function Article({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 640 }}>{children}</div>;
}

export function Rocket() {
  return (
    <Article>
      <BannerLink href="/docs/quickstart" icon="rocket">
        Build a workspace with messaging, events, and a typed action in five minutes.
      </BannerLink>
    </Article>
  );
}

export function Docs() {
  return (
    <Article>
      <BannerLink href="/docs/agent-relay-mcp" icon="docs">
        Give an agent Relay messaging and action tools over MCP.
      </BannerLink>
    </Article>
  );
}

export function Bot() {
  return (
    <Article>
      <BannerLink href="/docs/harnesses" icon="bot">
        How a harness creates a session, delivers a message, and reports a receipt.
      </BannerLink>
    </Article>
  );
}

export function Play() {
  return (
    <Article>
      <BannerLink href="/docs/orchestrating-with-actions" icon="play">
        Watch a planner fan work out to three agents and collect their results.
      </BannerLink>
    </Article>
  );
}

export function Compass() {
  return (
    <Article>
      <BannerLink href="/docs/nodes-and-providers" icon="compass">
        Pick the delivery host that fits your runtime: direct client, broker worker, or webhook.
      </BannerLink>
    </Article>
  );
}
