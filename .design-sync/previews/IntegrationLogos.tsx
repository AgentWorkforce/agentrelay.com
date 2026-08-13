import { IntegrationLogos } from 'web';

// Two densities: bare marks for gallery rows, mark + provider name for the
// detail page. Providers with no vendored logo (daytona, gcp, neon, npm,
// hacker-news) fall back to a text chip so a mixed set still reads correctly.
//
// The vendored marks live at /integration-logos/<provider>.svg and only resolve
// when the site's public/ tree is served alongside the component bundle — see
// .design-sync/learnings/brand.md.
export function InGalleryRow() {
  const rows = [
    { name: 'PR Reviewer', integrations: ['github', 'slack'] },
    { name: 'Repo Hygiene', integrations: ['github', 'notion', 'slack'] },
    { name: 'Granola Prospect', integrations: ['granola', 'linear', 'github'] },
    { name: 'Spotify Releases', integrations: ['spotify', 'slack', 'telegram'] },
  ];

  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      {rows.map((row) => (
        <div
          key={row.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid var(--line)',
            background: 'var(--card-bg)',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{row.name}</span>
          <IntegrationLogos
            integrations={row.integrations}
            withLabel
            className="agents_chips"
            chipClassName="agents_logoChip"
            logoClassName="agents_logoChipIcon"
          />
        </div>
      ))}
    </div>
  );
}

export function WithLabels() {
  return (
    <IntegrationLogos
      integrations={['github', 'slack', 'notion', 'linear']}
      withLabel
      className="agents_chips"
      chipClassName="agents_logoChip"
      logoClassName="agents_logoChipIcon"
    />
  );
}

export function TextOnlyFallback() {
  // .rowLogos declares `grid-area: logos` for the gallery row's named grid, so
  // it needs a block/flex parent here rather than a grid one.
  return (
    <div
      style={{
        maxWidth: 520,
        padding: 24,
        borderRadius: 16,
        background: 'var(--section-bg)',
      }}
    >
      <p style={{ margin: '0 0 8px', fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
        No vendored mark — bare density falls back to text chips
      </p>
      <IntegrationLogos
        integrations={['daytona', 'gcp', 'neon', 'npm', 'hacker-news']}
        className="agents_rowLogos"
        logoClassName="agents_rowLogo"
        chipClassName="agents_chip"
      />
      <p style={{ margin: '20px 0 8px', fontSize: '0.72rem', color: 'var(--fg-muted)' }}>
        Mixed set, labeled — Neon Monitor
      </p>
      <IntegrationLogos
        integrations={['neon', 'slack']}
        withLabel
        className="agents_chips"
        chipClassName="agents_logoChip"
        logoClassName="agents_logoChipIcon"
      />
    </div>
  );
}

export function InMetaRow() {
  return (
    <aside className="agents_metaCard" style={{ maxWidth: 340 }}>
      <div className="agents_metaRow">
        <span className="agents_metaLabel">Trigger</span>
        <span className="agents_metaValue">When a PR is opened or updated</span>
      </div>
      <div className="agents_metaRow">
        <span className="agents_metaLabel">Runtime</span>
        <span className="agents_metaValue">Codex · gpt-5.5</span>
      </div>
      <div className="agents_metaRow">
        <span className="agents_metaLabel">Integrations</span>
        <IntegrationLogos
          integrations={['github', 'slack']}
          withLabel
          className="agents_chips"
          chipClassName="agents_logoChip"
          logoClassName="agents_logoChipIcon"
        />
      </div>
    </aside>
  );
}
