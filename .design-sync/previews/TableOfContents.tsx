import type { ReactNode } from 'react';
import { DocsLanguageProvider, TableOfContents } from 'web';

// The TOC lives in the 200px docs rail, so it is authored at that width.
function Rail({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: 200 }}>
      <DocsLanguageProvider>{children}</DocsLanguageProvider>
    </div>
  );
}

// Headings from /docs/delivery.
export function DocsPage() {
  return (
    <Rail>
      <TableOfContents
        items={[
          { id: 'delivery-guarantees', text: 'Delivery guarantees', level: 2 },
          { id: 'receipts', text: 'Receipts', level: 2 },
          { id: 'accepted', text: 'accepted', level: 3 },
          { id: 'delivered', text: 'delivered', level: 3 },
          { id: 'deferred', text: 'deferred', level: 3 },
          { id: 'failed', text: 'failed', level: 3 },
          { id: 'offline-participants', text: 'Offline participants', level: 2 },
          { id: 'ordering', text: 'Ordering', level: 2 },
          { id: 'see-also', text: 'See also', level: 2 },
        ]}
      />
    </Rail>
  );
}

// Headings from /docs/channels — top level only, no nesting.
export function TopLevelOnly() {
  return (
    <Rail>
      <TableOfContents
        items={[
          { id: 'join-channels-on-spawn', text: 'Join channels on spawn', level: 2 },
          { id: 'post-channel-messages', text: 'Post channel messages', level: 2 },
          { id: 'when-to-use-channels', text: 'When to use channels', level: 2 },
          { id: 'see-also', text: 'See also', level: 2 },
        ]}
      />
    </Rail>
  );
}

// A page with no h2/h3 keeps the language and version controls and drops the
// "On this page" nav entirely.
export function NoHeadings() {
  return (
    <Rail>
      <TableOfContents items={[]} />
    </Rail>
  );
}

// Long heading text truncates rather than wrapping the rail.
export function LongHeadings() {
  return (
    <Rail>
      <TableOfContents
        items={[
          { id: 'enrol-a-node', text: 'Enrol a node from the CLI', level: 2 },
          {
            id: 'node-ids-and-working-directories',
            text: 'Node ids and working directories',
            level: 3,
          },
          {
            id: 'broker-controlled-workers-vs-direct-clients',
            text: 'Broker-controlled workers vs direct clients',
            level: 3,
          },
          { id: 'rotating-a-node-token', text: 'Rotating a node token', level: 2 },
        ]}
      />
    </Rail>
  );
}
