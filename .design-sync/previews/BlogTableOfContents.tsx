import type { ReactNode } from 'react';
import { BlogTableOfContents } from 'web';

// The blog rail is wider than the docs one and carries its own hairline.
function Rail({ children }: { children: ReactNode }) {
  return <div style={{ width: 240 }}>{children}</div>;
}

// The first entry is active until the reader scrolls, which is the state a
// post loads in.
export function Default() {
  return (
    <Rail>
      <BlogTableOfContents
        items={[
          { id: 'what-we-shipped', text: 'What we shipped', level: 2 },
          { id: 'durable-by-default', text: 'Durable by default', level: 2 },
          { id: 'what-comes-next', text: 'What comes next', level: 2 },
        ]}
      />
    </Rail>
  );
}

export function WithSubheadings() {
  return (
    <Rail>
      <BlogTableOfContents
        items={[
          { id: 'the-problem', text: 'The problem', level: 2 },
          { id: 'two-agents-one-thread', text: 'Two agents, one thread', level: 3 },
          { id: 'why-polling-lost', text: 'Why polling lost', level: 3 },
          { id: 'the-fix', text: 'The fix', level: 2 },
          { id: 'delivery-receipts', text: 'Delivery receipts', level: 3 },
          { id: 'results', text: 'Results', level: 2 },
        ]}
      />
    </Rail>
  );
}

export function LongPost() {
  return (
    <Rail>
      <BlogTableOfContents
        items={[
          { id: 'why-a-broker', text: 'Why a broker', level: 2 },
          { id: 'the-spike', text: 'The spike', level: 2 },
          { id: 'node-enrolment', text: 'Node enrolment', level: 3 },
          { id: 'agent-tokens', text: 'Agent tokens', level: 3 },
          { id: 'delivery-into-live-sessions', text: 'Delivery into live sessions', level: 3 },
          { id: 'what-broke', text: 'What broke', level: 2 },
          { id: 'reconnect-storms', text: 'Reconnect storms', level: 3 },
          { id: 'where-we-landed', text: 'Where we landed', level: 2 },
        ]}
      />
    </Rail>
  );
}
