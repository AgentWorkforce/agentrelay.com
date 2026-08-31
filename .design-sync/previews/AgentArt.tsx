import { AgentArt } from 'web';

// Agents without committed PNGs (hasCustomArt: false) render a deterministic
// gradient built from their accent plus a monogram, so static renders, OG cards
// and the sitemap stay stable. Every variant is position:absolute; inset:0, so
// the parent must be positioned and sized.
//
// The hasCustomArt: true path points at /agent-art/<slug>/<variant>.png, which
// only resolves when the site's public/ tree is served alongside the component
// bundle — see .design-sync/learnings/brand.md.
const jokeBot = {
  slug: 'joke-bot',
  personaId: 'joke-bot',
  dir: 'joke-bot',
  name: 'Joke Bot',
  accent: '#f5a623',
  hasCustomArt: false,
};

const neonMonitor = {
  slug: 'neon-monitor',
  personaId: 'neon-monitor',
  dir: 'neon-monitor',
  name: 'Neon Monitor',
  accent: '#00e599',
  hasCustomArt: false,
};

const inboxBuddy = {
  slug: 'inbox-buddy',
  personaId: 'inbox-buddy',
  dir: 'inbox-buddy',
  name: 'Inbox Buddy',
  accent: '#ea4335',
  hasCustomArt: false,
};

const cloudflareMonitor = {
  slug: 'cloudflare-monitor',
  personaId: 'cloudflare-monitor',
  dir: 'cloudflare-monitor',
  name: 'Cloudflare Monitor',
  accent: '#f6821f',
  hasCustomArt: false,
};

const gcpWatcher = {
  slug: 'gcp-watcher',
  personaId: 'gcp-watcher',
  dir: 'gcp-watcher',
  name: 'GCP Watcher',
  accent: '#4285f4',
  hasCustomArt: false,
};

export function DetailBanner() {
  return (
    <div className="agents_detailBanner" style={{ maxWidth: 700 }}>
      <AgentArt agent={neonMonitor} variant="banner" alt="Neon Monitor banner" loading="eager" />
    </div>
  );
}

export function AccentGradients() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        padding: 24,
        borderRadius: 18,
        background: 'var(--section-bg)',
      }}
    >
      {[jokeBot, neonMonitor, inboxBuddy, cloudflareMonitor].map((agent) => (
        <div key={agent.slug} style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              position: 'relative',
              width: 180,
              height: 180,
              borderRadius: 18,
              overflow: 'hidden',
              border: '1px solid var(--line)',
            }}
          >
            <AgentArt agent={agent} variant="card" />
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>{agent.name}</span>
        </div>
      ))}
    </div>
  );
}

export function Variants() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        padding: 24,
        borderRadius: 18,
        background: 'var(--section-bg)',
      }}
    >
      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            position: 'relative',
            width: 400,
            height: 112,
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--line)',
          }}
        >
          <AgentArt agent={jokeBot} variant="banner" />
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>variant=&quot;banner&quot;</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            position: 'relative',
            width: 180,
            height: 180,
            borderRadius: 14,
            overflow: 'hidden',
            border: '1px solid var(--line)',
          }}
        >
          <AgentArt agent={jokeBot} variant="card" />
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>variant=&quot;card&quot;</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <div
          style={{
            position: 'relative',
            width: 104,
            height: 104,
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid var(--line)',
          }}
        >
          <AgentArt agent={jokeBot} variant="card-sm" />
        </div>
        <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>variant=&quot;card-sm&quot;</span>
      </div>
    </div>
  );
}

export function InGalleryCard() {
  const cards = [
    { agent: cloudflareMonitor, tagline: 'Watches Workers and D1 for errors, then pages Slack.' },
    { agent: gcpWatcher, tagline: 'Flags budget overruns and quota pressure before they bite.' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {cards.map((card) => (
        <div
          key={card.agent.slug}
          style={{
            width: 260,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid var(--line)',
            background: 'var(--card-bg)',
          }}
        >
          <div style={{ position: 'relative', height: 150 }}>
            <AgentArt agent={card.agent} variant="card" />
          </div>
          <div style={{ padding: 16, display: 'grid', gap: 4 }}>
            <span style={{ fontWeight: 600 }}>{card.agent.name}</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--fg-muted)' }}>{card.tagline}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
