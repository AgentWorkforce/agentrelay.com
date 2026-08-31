import { Badge, Card, CardDescription, CardHeader, CardTitle, FadeIn } from 'web';

// FadeIn reveals its children on scroll. Anything already inside the viewport —
// which is every preview cell — renders in its settled state: full opacity, no
// transform. The direction prop only shows during the 700ms travel.
export function Default() {
  return (
    <FadeIn>
      <Card style={{ maxWidth: 380, padding: 24 }}>
        <CardHeader className="p-0 pb-4">
          <CardTitle>PR Reviewer</CardTitle>
          <CardDescription>Reviews, fixes, and shepherds pull requests.</CardDescription>
        </CardHeader>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.9rem', margin: 0 }}>
          Runs on every opened and updated PR, pushes fixes to the branch, and merges once an approver signs
          off.
        </p>
      </Card>
    </FadeIn>
  );
}

export function Directions() {
  const panels = [
    { direction: 'up' as const, title: 'up', copy: 'Sections rising into the viewport — the default.' },
    { direction: 'right' as const, title: 'right', copy: 'Copy entering from the left of a split row.' },
    { direction: 'left' as const, title: 'left', copy: 'Artwork entering from the right of a split row.' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {panels.map((panel) => (
        <FadeIn key={panel.direction} direction={panel.direction}>
          <div
            style={{
              width: 220,
              padding: 20,
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card-bg)',
            }}
          >
            <Badge variant="secondary">direction=&quot;{panel.title}&quot;</Badge>
            <p style={{ color: 'var(--fg-muted)', fontSize: '0.85rem', margin: '12px 0 0' }}>{panel.copy}</p>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}

export function StaggeredList() {
  const agents = [
    { name: 'PR Reviewer', tagline: 'Reviews, fixes, and shepherds pull requests.' },
    { name: 'Repo Hygiene', tagline: 'Finds codebase entropy before it turns into debt.' },
    { name: 'Hacker News Monitor', tagline: 'Posts only the stories your team cares about.' },
    { name: 'Vendor Monitor', tagline: 'Watches npm releases and flags breaking changes.' },
  ];

  return (
    <div style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
      {agents.map((agent, index) => (
        <FadeIn key={agent.name} delay={index * 40}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '14px 18px',
              borderRadius: 12,
              border: '1px solid var(--line)',
              background: 'var(--card-bg)',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{agent.name}</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--fg-muted)' }}>{agent.tagline}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--fg-faint)' }}>delay={index * 40}ms</span>
          </div>
        </FadeIn>
      ))}
    </div>
  );
}
