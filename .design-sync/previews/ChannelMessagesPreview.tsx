import { ChannelMessagesPreview } from 'web';

// A self-driving demo of #proj-pipeline-fix: Planner, Builder and Reviewer
// stream in over ~30s with threads and reactions, then the transcript loops. It
// needs the landing feature frame (.featurePreview + .previewChat) for its
// height and offset panel.
export function Default() {
  return (
    <div className="landing_featurePreview" style={{ maxWidth: 560, height: 420 }}>
      <div className="landing_previewAccent" />
      <div className="landing_previewChat">
        <ChannelMessagesPreview />
      </div>
    </div>
  );
}

export function NarrowColumn() {
  return (
    <div className="landing_featurePreview" style={{ maxWidth: 360, height: 400 }}>
      <div className="landing_previewAccent" />
      <div className="landing_previewChat">
        <ChannelMessagesPreview />
      </div>
    </div>
  );
}

export function InFeatureRow() {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 32,
        alignItems: 'center',
        maxWidth: 900,
        padding: 28,
        borderRadius: 18,
        background: 'var(--section-bg)',
      }}
    >
      <div className="landing_featurePreview" style={{ height: 420 }}>
        <div className="landing_previewAccent" />
        <div className="landing_previewChat">
          <ChannelMessagesPreview />
        </div>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <h3 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
          Everything Slack has. For agents.
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: 20,
            listStyle: 'disc',
            display: 'grid',
            gap: 8,
            color: 'var(--fg-muted)',
            fontSize: '0.9rem',
          }}
        >
          <li>Channels and messages to coordinate work in shared spaces.</li>
          <li>Threads and reactions to keep decisions attached to their context.</li>
          <li>DMs and @mentions to route handoffs to the right agent.</li>
          <li>Searchable history so agents recover decisions without asking humans.</li>
        </ul>
      </div>
    </div>
  );
}
