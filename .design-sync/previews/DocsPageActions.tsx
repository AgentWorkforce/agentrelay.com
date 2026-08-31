import { DocsPageActions } from 'web';

// A shrink-to-fit box, so the control is always measured at its intrinsic
// width — it stretches to fill a block container below the 900px breakpoint.
export function Default() {
  return (
    <div style={{ display: 'inline-block' }}>
      <DocsPageActions
        title="Delivery"
        pageUrl="https://agentrelay.com/docs/delivery"
        markdownPath="/docs/markdown/delivery.md"
        markdownUrl="https://agentrelay.com/docs/markdown/delivery.md"
      />
    </div>
  );
}

// How it sits in the docs article header: pinned to the right of the h1, with
// the page description below.
export function InArticleHeader() {
  return (
    <div className="docs_article" style={{ maxWidth: 620 }}>
      <div className="docs_articleHeader">
        <div className="docs_articleHeading">
          <h1>Nodes and providers</h1>
        </div>
        <DocsPageActions
          title="Nodes and providers"
          pageUrl="https://agentrelay.com/docs/nodes-and-providers"
          markdownPath="/docs/markdown/nodes-and-providers.md"
          markdownUrl="https://agentrelay.com/docs/markdown/nodes-and-providers.md"
        />
      </div>
      <p className="docs_articleDescription">
        Delivery hosts that route work to direct clients, broker-controlled workers, HTTP endpoints,
        or polling integrations.
      </p>
    </div>
  );
}

// The control keeps its width no matter how long the page title is — the title
// only reaches the prompt handed to ChatGPT and Claude.
export function LongTitle() {
  return (
    <div className="docs_article" style={{ maxWidth: 620 }}>
      <div className="docs_articleHeader">
        <div className="docs_articleHeading">
          <h1>Orchestrating a team of agents with typed actions</h1>
        </div>
        <DocsPageActions
          title="Orchestrating a team of agents with typed actions"
          pageUrl="https://agentrelay.com/docs/orchestrating-with-actions"
          markdownPath="/docs/markdown/orchestrating-with-actions.md"
          markdownUrl="https://agentrelay.com/docs/markdown/orchestrating-with-actions.md"
        />
      </div>
    </div>
  );
}
