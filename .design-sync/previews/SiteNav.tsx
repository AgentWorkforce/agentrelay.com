import { useEffect, type ReactNode } from 'react';
import { Button, DocsGitHubStarsBadge, DocsSearch, SiteNav } from 'web';

/** `usePathname()` is shimmed and steerable — the nav closes its menu on route change. */
function atPath(pathname: string) {
  (window as { __dsPathname?: string }).__dsPathname = pathname;
}

function Page({ children, tall }: { children: ReactNode; tall?: boolean }) {
  return (
    <div
      style={{
        paddingTop: 12,
        paddingBottom: 32,
        minHeight: tall ? 1600 : undefined,
        background: 'var(--bg)',
        color: 'var(--fg)',
        fontFamily: 'var(--font-geist-sans), sans-serif',
      }}
    >
      {children}
    </div>
  );
}

const starRepos = [
  {
    id: null,
    repo: 'agentworkforce/relay',
    href: 'https://github.com/agentworkforce/relay',
    label: 'Agent Relay',
  },
];

const docsSearchIndex = [
  {
    slug: 'channels',
    title: 'Channels',
    description: 'Group agents into durable, replayable rooms.',
    headings: ['Creating a channel', 'Replay on reconnect'],
    body: 'Channels are durable. A reconnecting agent replays everything it missed.',
  },
  {
    slug: 'delivery',
    title: 'Delivery',
    description: 'Acknowledgements, retries, and offline queueing.',
    headings: ['Acknowledgements', 'Retries'],
    body: 'Messages sent to an offline node are queued and delivered on reconnect.',
  },
];

function seedStars() {
  window.localStorage.setItem(
    'agentrelay:github-stars:agentworkforce/relay',
    JSON.stringify({ count: '2.4k', expiresAt: Date.now() + 60 * 60 * 1000 })
  );
}

/** The docs layout's own call site: search in the center slot, stars in the actions slot. */
export function DocsHeader() {
  atPath('/docs/channels');
  seedStars();
  return (
    <Page>
      <SiteNav
        center={<DocsSearch index={docsSearchIndex} />}
        actions={<DocsGitHubStarsBadge repos={starRepos} />}
        hideMobileDocsLink
      />
    </Page>
  );
}

export function MarketingNav() {
  atPath('/');
  return (
    <Page>
      <SiteNav actions={<Button size="sm">Get started</Button>} />
    </Page>
  );
}

/** The blog and about pages drop the nav links and keep a single call to action. */
export function WithoutLinks() {
  atPath('/blog');
  return (
    <Page>
      <SiteNav
        hideLinks
        actions={<Button size="sm">Get started</Button>}
        mobileMenuContent={<Button size="sm">Get started</Button>}
      />
    </Page>
  );
}

/**
 * Past 20px of scroll the bar swaps its solid background for the frosted
 * treatment — a translucent gradient over `backdrop-filter: blur(24px)`. It
 * needs a scrolled page to show, so the cell provides one.
 */
export function ScrolledGlass() {
  atPath('/');

  useEffect(() => {
    window.scrollTo(0, 240);
  }, []);

  return (
    <Page tall>
      <SiteNav actions={<Button size="sm">Get started</Button>} />
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ margin: '0 0 12px', fontSize: '2.4rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
          The future is multi-agent
        </h1>
        <p style={{ margin: '0 0 28px', maxWidth: 640, color: 'var(--fg-muted)', fontSize: '1.05rem' }}>
          Channels, DMs, threads, and durable delivery for the coding agents already running on your
          machine. The bar goes translucent as the page moves under it.
        </p>
        {['Spawn an agent', 'Open a channel', 'Watch the transcript', 'Hand off the review'].map((row) => (
          <div
            key={row}
            style={{
              padding: '18px 20px',
              marginBottom: 12,
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card-bg)',
              color: 'var(--fg-muted)',
            }}
          >
            {row}
          </div>
        ))}
      </section>
    </Page>
  );
}
