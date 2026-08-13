import { useEffect, useRef, type ReactNode } from 'react';
import { DocsSearch } from 'web';

type Entry = {
  slug: string;
  title: string;
  description: string;
  headings: string[];
  body: string;
};

/** A slice of the real `/docs` search index (lib/docs.ts `getSearchIndex()`). */
const relayIndex: Entry[] = [
  {
    slug: 'quickstart',
    title: 'Quickstart',
    description: 'Install the CLI, start the broker, and spawn your first agent.',
    headings: ['Install', 'Start the broker', 'Spawn an agent'],
    body: 'npm install -g agent-relay then agent-relay start to bring the broker up.',
  },
  {
    slug: 'channels',
    title: 'Channels',
    description: 'Group agents into durable, replayable rooms.',
    headings: ['Creating a channel', 'Joining', 'Replay on reconnect'],
    body: 'Channels are durable. An agent that reconnects replays everything it missed.',
  },
  {
    slug: 'messaging',
    title: 'Messaging overview',
    description: 'How messages move between agents, nodes, and humans.',
    headings: ['Addressing', 'Channels and DMs', 'Delivery guarantees'],
    body: 'Every message is addressed to an agent, a channel, or a thread.',
  },
  {
    slug: 'dms',
    title: 'DMs and group DMs',
    description: 'Direct conversations between two or more agents.',
    headings: ['Opening a DM', 'Group DMs'],
    body: 'A DM is a channel with an implicit membership list.',
  },
  {
    slug: 'threads',
    title: 'Threads',
    description: 'Keep a side conversation attached to the message that started it.',
    headings: ['Replying in a thread', 'Thread broadcast'],
    body: 'Threads keep long-running work out of the main channel transcript.',
  },
  {
    slug: 'delivery',
    title: 'Delivery',
    description: 'Acknowledgements, retries, and what happens while a node is offline.',
    headings: ['Acknowledgements', 'Retries', 'Offline queueing'],
    body: 'Messages sent to an offline node are queued and delivered on reconnect.',
  },
  {
    slug: 'webhooks',
    title: 'Webhooks',
    description: 'Push relay events into your own services.',
    headings: ['Registering a webhook', 'Signing', 'Retry policy'],
    body: 'Webhooks are signed with the workspace key and retried with backoff.',
  },
  {
    slug: 'typescript-sdk',
    title: 'TypeScript SDK',
    description: 'The @relaycast/sdk client for agents and observers.',
    headings: ['Install', 'Connecting', 'Sending messages', 'Event handlers'],
    body: 'The SDK is the supported way to talk to the relay from TypeScript.',
  },
  {
    slug: 'harnesses',
    title: 'Harnesses',
    description: 'Run claude, codex, or opencode as a relay agent.',
    headings: ['Supported harnesses', 'Session capabilities'],
    body: 'A harness is the coding agent the broker drives through a PTY.',
  },
  {
    slug: 'authentication',
    title: 'Authentication',
    description: 'Workspace keys, agent tokens, node tokens, and observer tokens.',
    headings: ['Key types', 'Rotating a key', 'Observer streams'],
    body: 'The workspace key is not a super-admin key. Observer streams need an observer token.',
  },
];

/** The Relayfile section keeps its own index and its own base path. */
const relayfileIndex: Entry[] = [
  {
    slug: 'mount-layout',
    title: 'Mount layout',
    description: 'What a mounted workspace looks like on disk.',
    headings: ['Directory shape', 'Reserved paths'],
    body: 'Every mount exposes the same directory shape regardless of adapter.',
  },
  {
    slug: 'mounting',
    title: 'Mounting a workspace',
    description: 'Attach a workspace to a local path and keep it in sync.',
    headings: ['Mount a workspace', 'Unmounting'],
    body: 'relayfile mount attaches a workspace to a local directory.',
  },
  {
    slug: 'acls',
    title: 'Per-agent ACLs',
    description: 'Scope what each agent can read and write inside a mount.',
    headings: ['Granting access', 'Deny rules'],
    body: 'ACLs are evaluated per agent, per path prefix.',
  },
  {
    slug: 'realtime-sync',
    title: 'Real-time sync',
    description: 'How writes propagate to every mounted client.',
    headings: ['Change events', 'Conflict handling'],
    body: 'Writes fan out to every mount subscribed to the path.',
  },
  {
    slug: 'reads-and-writes',
    title: 'Reads and writes',
    description: 'The file operations an agent can perform against a mount.',
    headings: ['Reading', 'Writing', 'Atomic replace'],
    body: 'Reads are served from the local mount; writes go through the adapter.',
  },
];

const productScopes = [
  { id: 'file', label: 'Relayfile', basePath: '/docs/file', index: relayfileIndex },
];

function atPath(pathname: string) {
  (window as { __dsPathname?: string }).__dsPathname = pathname;
}

/** Mirrors `site-nav.module.css .navCenter`, the slot the trigger ships in. */
function NavCenter({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 360,
        padding: 10,
        borderRadius: 14,
        border: '1px solid var(--nav-border)',
        background: 'var(--nav-solid-bg)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Types a query into the search modal.
 *
 * The modal portals to `document.body`, so it escapes the preview cell and
 * would cover every sibling cell in the grid card. It is opened only for the
 * solo `?story=` render the capture harness drives.
 */
function useTypedQuery(query: string) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has('story')) return;

    const trigger = ref.current?.querySelector('button');
    if (!trigger) return;
    trigger.click();

    // The modal mounts on the commit after the click, so wait for it.
    let attempts = 0;
    const type = () => {
      const input = document.querySelector('input');
      if (!input) {
        if (attempts++ < 20) requestAnimationFrame(type);
        return;
      }
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setValue?.call(input, query);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    requestAnimationFrame(type);
  }, [query]);

  return ref;
}

export function Trigger() {
  atPath('/docs/messaging');
  return (
    <NavCenter>
      <DocsSearch index={relayIndex} productScopes={productScopes} />
    </NavCenter>
  );
}

export function SearchResults() {
  atPath('/docs/messaging');
  const ref = useTypedQuery('channels');
  return (
    <NavCenter>
      <div ref={ref}>
        <DocsSearch index={relayIndex} productScopes={productScopes} />
      </div>
    </NavCenter>
  );
}

export function ScopedToRelayfile() {
  atPath('/docs/file/mount-layout');
  const ref = useTypedQuery('mount');
  return (
    <NavCenter>
      <div ref={ref}>
        <DocsSearch index={relayIndex} productScopes={productScopes} />
      </div>
    </NavCenter>
  );
}

export function NoResults() {
  atPath('/docs/messaging');
  const ref = useTypedQuery('kubernetes');
  return (
    <NavCenter>
      <div ref={ref}>
        <DocsSearch index={relayIndex} productScopes={productScopes} />
      </div>
    </NavCenter>
  );
}
