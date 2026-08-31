import { IntegrationGrid } from 'web';

// The grid takes no props: it renders the whole adapter catalogue, grouped by
// category, straight from lib/integrations.
export function Default() {
  return (
    <div style={{ maxWidth: 780 }}>
      <IntegrationGrid />
    </div>
  );
}

// How it appears in /docs/file/integrations — dropped into the article body
// between two paragraphs of prose.
export function InDocsArticle() {
  return (
    <div className="docs_article" style={{ maxWidth: 780 }}>
      <h2>Integrations</h2>
      <p>
        Relayfile mounts a provider as files. Every integration below becomes a directory an agent
        can read, write, and watch: <code>/slack/channels/…</code>, <code>/linear/issues/…</code>,{' '}
        <code>/github/pulls/…</code>. Same shape for all of them.
      </p>
      <IntegrationGrid />
      <p>
        That means the list above is what we have shipped, not what is possible. If your provider is
        in the aggregator catalogue, wiring it up is an adapter, not an integration project.
      </p>
    </div>
  );
}
